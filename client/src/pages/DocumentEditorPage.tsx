import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useDocumentStore } from '../stores/documentStore';
import api from '../hooks/useApi';
import type { Document, FormTemplate, User, DocumentAttachment } from '../types';
import FormRenderer from '../components/documents/FormRenderer';
import TagInput from '../components/documents/TagInput';
import DocumentAttachments from '../components/documents/DocumentAttachments';

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { categories, templates, setCategories, setTemplates } = useDocumentStore();

  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<'freeform' | 'form'>('freeform');
  const [content, setContent] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<User[]>([]);
  const [shareUserIds, setShareUserIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<DocumentAttachment[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(id || null);

  useEffect(() => {
    loadCategories();
    loadTemplates();
    loadMembers();
    if (isEdit) loadDocument();
  }, [id]);

  const loadCategories = async () => {
    try {
      const { data } = await api.get('/document-categories');
      setCategories(data);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await api.get('/form-templates');
      setTemplates(data);
    } catch (err) {
      console.error('Load templates error:', err);
    }
  };

  const loadMembers = async () => {
    try {
      const { data } = await api.get('/users');
      setMembers(data);
    } catch (err) {
      console.error('Load members error:', err);
    }
  };

  const loadDocument = async () => {
    try {
      const { data } = await api.get(`/documents/${id}`);
      setTitle(data.title);
      setDocType(data.doc_type);
      setCategoryId(data.category_id || '');
      setIsPublic(data.is_public);
      setTags(data.tags?.map((t: { name: string }) => t.name) || []);
      setShareUserIds(data.shares?.map((s: { user_id: string }) => s.user_id) || []);
      setAttachments(data.attachments || []);

      if (data.doc_type === 'form' && data.template_id) {
        setTemplateId(data.template_id);
        // Parse form content
        try {
          setFormValues(JSON.parse(data.content || '{}'));
        } catch {
          setFormValues({});
        }
        // Load template for field definitions
        const { data: tmpl } = await api.get(`/form-templates/${data.template_id}`);
        setSelectedTemplate(tmpl);
      } else {
        setContent(data.content || '');
      }
    } catch (err) {
      console.error('Load document error:', err);
      navigate('/documents');
    }
  };

  const handleTemplateChange = async (tmplId: string) => {
    setTemplateId(tmplId);
    if (tmplId) {
      const tmpl = templates.find((t) => t.id === tmplId);
      if (tmpl) {
        setSelectedTemplate(tmpl);
        setFormValues({});
      }
    } else {
      setSelectedTemplate(null);
    }
  };

  const handleSave = async (status: 'draft' | 'pending') => {
    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const docContent = docType === 'form' ? JSON.stringify(formValues) : content;
      const payload = {
        title: title.trim(),
        doc_type: docType,
        content: docContent,
        template_id: docType === 'form' ? templateId || undefined : undefined,
        category_id: categoryId || undefined,
        tags,
        is_public: isPublic,
        status,
      };

      let savedDoc: Document;
      if (isEdit) {
        const { data } = await api.patch(`/documents/${id}`, payload);
        savedDoc = data;
        // If submitting, call submit endpoint (PATCH doesn't change status)
        if (status === 'pending') {
          const { data: submitted } = await api.post(`/documents/${id}/submit`);
          savedDoc = submitted;
        }
      } else {
        // For new documents, create with desired status directly
        const { data } = await api.post('/documents', payload);
        savedDoc = data;
        setDocumentId(data.id);
      }

      // Set shares
      if (shareUserIds.length > 0) {
        await api.post(`/documents/${savedDoc.id}/share`, { user_ids: shareUserIds });
      }

      navigate(`/documents/${savedDoc.id}`);
    } catch (err) {
      console.error('Save document error:', err);
      alert('문서 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleFormValueChange = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleShareUser = (userId: string) => {
    setShareUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const reloadAttachments = async () => {
    if (!documentId) return;
    const { data } = await api.get(`/documents/${documentId}`);
    setAttachments(data.attachments || []);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>{isEdit ? '문서 편집' : '새 문서'}</h1>
        <button
          onClick={() => navigate('/documents')}
          style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
        >
          취소
        </button>
      </div>

      {/* Document type selection */}
      {!isEdit && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>문서 유형</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => { setDocType('freeform'); setSelectedTemplate(null); setTemplateId(''); }}
              style={{
                padding: '0.5rem 1rem', border: '1px solid',
                borderColor: docType === 'freeform' ? '#1976d2' : '#ddd',
                borderRadius: '4px', cursor: 'pointer',
                background: docType === 'freeform' ? '#e3f2fd' : '#fff',
                color: docType === 'freeform' ? '#1976d2' : '#333',
              }}
            >
              자유 문서
            </button>
            <button
              onClick={() => setDocType('form')}
              style={{
                padding: '0.5rem 1rem', border: '1px solid',
                borderColor: docType === 'form' ? '#1976d2' : '#ddd',
                borderRadius: '4px', cursor: 'pointer',
                background: docType === 'form' ? '#e3f2fd' : '#fff',
                color: docType === 'form' ? '#1976d2' : '#333',
              }}
            >
              양식 문서
            </button>
          </div>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="문서 제목을 입력하세요"
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' }}
        />
      </div>

      {/* Template selection (form type) */}
      {docType === 'form' && !isEdit && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>양식 템플릿</label>
          <select
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
          >
            <option value="">템플릿을 선택하세요</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}{t.description ? ` - ${t.description}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Content area */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>내용</label>
        {docType === 'freeform' ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="문서 내용을 입력하세요"
            rows={15}
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box', lineHeight: '1.6' }}
          />
        ) : selectedTemplate ? (
          <FormRenderer
            fields={selectedTemplate.schema.fields}
            values={formValues}
            onChange={handleFormValueChange}
          />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '4px' }}>
            템플릿을 선택하면 양식이 표시됩니다.
          </div>
        )}
      </div>

      {/* Category */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>카테고리</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
        >
          <option value="">카테고리 없음</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>태그</label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {/* Public toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span style={{ fontWeight: 500 }}>전체 공개</span>
          <span style={{ fontSize: '0.8rem', color: '#999' }}>(모든 구성원이 볼 수 있습니다)</span>
        </label>
      </div>

      {/* Share with specific users */}
      {!isPublic && members.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontWeight: 500, display: 'block', marginBottom: '0.3rem' }}>공유 대상</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {members
              .filter((m) => m.id !== user?.id)
              .map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.6rem', border: '1px solid',
                    borderColor: shareUserIds.includes(m.id) ? '#1976d2' : '#ddd',
                    borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
                    background: shareUserIds.includes(m.id) ? '#e3f2fd' : '#fff',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={shareUserIds.includes(m.id)}
                    onChange={() => toggleShareUser(m.id)}
                    style={{ display: 'none' }}
                  />
                  {m.name}
                </label>
              ))}
          </div>
        </div>
      )}

      {/* Attachments (only for saved documents) */}
      {documentId && (
        <div style={{ marginBottom: '1.5rem' }}>
          <DocumentAttachments
            documentId={documentId}
            attachments={attachments}
            onUpdate={reloadAttachments}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <button
          onClick={() => navigate('/documents')}
          style={{ padding: '0.5rem 1.5rem', border: '1px solid #ddd', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
        >
          취소
        </button>
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          style={{
            padding: '0.5rem 1.5rem', border: '1px solid #ddd', borderRadius: '4px',
            background: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '임시저장'}
        </button>
        <button
          onClick={() => handleSave('pending')}
          disabled={saving}
          style={{
            padding: '0.5rem 1.5rem', border: 'none', borderRadius: '4px',
            background: '#1976d2', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 'bold',
          }}
        >
          {saving ? '제출 중...' : '제출'}
        </button>
      </div>
    </div>
  );
}
