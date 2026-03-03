import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { authenticate, AuthRequest } from '../middleware/auth';
import { requireCeo } from '../middleware/roleGuard';

const FORMS_DIR = '/home/kimboguk/workspace/project/business/qbique/form';

const router = Router();

// multer: 원본 파일명 유지, 한글 인코딩 처리
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FORMS_DIR);
  },
  filename: (_req, file, cb) => {
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const name = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(name).toLowerCase();
    const allowed = ['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.hwp'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  },
});

// LibreOffice를 이용한 Word → PDF 변환
function convertToPdf(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(filePath);
    execFile(
      'libreoffice',
      ['--headless', '--convert-to', 'pdf', '--outdir', dir, filePath],
      { timeout: 60000 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(new Error(`PDF 변환 실패: ${stderr || error.message}`));
          return;
        }
        const baseName = path.basename(filePath, path.extname(filePath));
        const pdfPath = path.join(dir, `${baseName}.pdf`);
        resolve(pdfPath);
      }
    );
  });
}

function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const typeMap: Record<string, string> = {
    '.docx': 'docx', '.doc': 'doc',
    '.pdf': 'pdf',
    '.xlsx': 'xlsx', '.xls': 'xls',
    '.hwp': 'hwp',
  };
  return typeMap[ext] || 'other';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// GET /api/corporate-forms — 파일 목록
router.get('/', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = fs.readdirSync(FORMS_DIR);
    const fileList = files
      .filter((f) => !f.startsWith('.'))
      .map((filename) => {
        const filePath = path.join(FORMS_DIR, filename);
        const stat = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const baseName = path.basename(filename, ext);

        // .docx에 대응하는 .pdf가 있는지 확인
        let hasPdf = false;
        if (['.docx', '.doc'].includes(ext)) {
          hasPdf = fs.existsSync(path.join(FORMS_DIR, `${baseName}.pdf`));
        }

        return {
          filename,
          size: stat.size,
          sizeFormatted: formatFileSize(stat.size),
          modified: stat.mtime.toISOString(),
          type: getFileType(filename),
          hasPdf,
        };
      })
      .sort((a, b) => a.filename.localeCompare(b.filename, 'ko'));

    res.json(fileList);
  } catch (err) {
    console.error('Corporate forms list error:', err);
    res.status(500).json({ error: '서식 목록 조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/corporate-forms/download/:filename — 파일 다운로드
router.get('/download/:filename', authenticate, (req: AuthRequest, res: Response): void => {
  try {
    const { filename } = req.params;
    const filePath = path.join(FORMS_DIR, filename);

    // 경로 탈출 방지
    if (!path.resolve(filePath).startsWith(FORMS_DIR)) {
      res.status(400).json({ error: '잘못된 파일 경로입니다.' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      return;
    }

    res.download(filePath, filename);
  } catch (err) {
    console.error('Corporate forms download error:', err);
    res.status(500).json({ error: '파일 다운로드 중 오류가 발생했습니다.' });
  }
});

// GET /api/corporate-forms/preview/:filename — PDF 미리보기
router.get('/preview/:filename', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const filePath = path.join(FORMS_DIR, filename);

    // 경로 탈출 방지
    if (!path.resolve(filePath).startsWith(FORMS_DIR)) {
      res.status(400).json({ error: '잘못된 파일 경로입니다.' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      return;
    }

    const ext = path.extname(filename).toLowerCase();

    if (ext === '.pdf') {
      // PDF는 그대로 반환
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    if (['.docx', '.doc'].includes(ext)) {
      // 동명 PDF가 있으면 그것을 반환
      const baseName = path.basename(filename, ext);
      const pdfPath = path.join(FORMS_DIR, `${baseName}.pdf`);

      if (fs.existsSync(pdfPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(baseName + '.pdf')}"`);
        fs.createReadStream(pdfPath).pipe(res);
        return;
      }

      // 없으면 변환 후 반환
      try {
        const convertedPath = await convertToPdf(filePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(baseName + '.pdf')}"`);
        fs.createReadStream(convertedPath).pipe(res);
        return;
      } catch (convErr) {
        console.error('PDF conversion error:', convErr);
        res.status(500).json({ error: 'PDF 변환에 실패했습니다.' });
        return;
      }
    }

    res.status(400).json({ error: '미리보기를 지원하지 않는 파일 형식입니다.' });
  } catch (err) {
    console.error('Corporate forms preview error:', err);
    res.status(500).json({ error: '미리보기 중 오류가 발생했습니다.' });
  }
});

// POST /api/corporate-forms/upload — 파일 업로드 (CEO만)
router.post('/upload', authenticate, requireCeo, upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: '파일을 선택해주세요.' });
      return;
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const filePath = path.join(FORMS_DIR, originalName);
    const ext = path.extname(originalName).toLowerCase();

    // .docx면 PDF 자동 생성
    if (['.docx', '.doc'].includes(ext)) {
      try {
        await convertToPdf(filePath);
      } catch (convErr) {
        console.error('Auto PDF conversion error:', convErr);
        // 변환 실패해도 업로드 자체는 성공 처리
      }
    }

    const stat = fs.statSync(filePath);
    res.status(201).json({
      filename: originalName,
      size: stat.size,
      sizeFormatted: formatFileSize(stat.size),
      modified: stat.mtime.toISOString(),
      type: getFileType(originalName),
    });
  } catch (err) {
    console.error('Corporate forms upload error:', err);
    res.status(500).json({ error: '파일 업로드 중 오류가 발생했습니다.' });
  }
});

// DELETE /api/corporate-forms/:filename — 파일 삭제 (CEO만)
router.delete('/:filename', authenticate, requireCeo, (req: AuthRequest, res: Response): void => {
  try {
    const { filename } = req.params;
    const filePath = path.join(FORMS_DIR, filename);

    // 경로 탈출 방지
    if (!path.resolve(filePath).startsWith(FORMS_DIR)) {
      res.status(400).json({ error: '잘못된 파일 경로입니다.' });
      return;
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
      return;
    }

    // 원본 삭제
    fs.unlinkSync(filePath);

    // 연관 PDF도 삭제 (.docx → .pdf)
    const ext = path.extname(filename).toLowerCase();
    if (['.docx', '.doc'].includes(ext)) {
      const baseName = path.basename(filename, ext);
      const pdfPath = path.join(FORMS_DIR, `${baseName}.pdf`);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    }

    res.json({ message: '파일이 삭제되었습니다.' });
  } catch (err) {
    console.error('Corporate forms delete error:', err);
    res.status(500).json({ error: '파일 삭제 중 오류가 발생했습니다.' });
  }
});

export default router;
