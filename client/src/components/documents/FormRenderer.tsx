import type { FormTemplateField } from '../../types';

interface FormRendererProps {
  fields: FormTemplateField[];
  values: Record<string, string>;
  onChange?: (key: string, value: string) => void;
  readOnly?: boolean;
}

export default function FormRenderer({ fields, values, onChange, readOnly }: FormRendererProps) {
  const handleChange = (key: string, value: string) => {
    if (onChange) onChange(key, value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {fields.map((field) => (
        <div key={field.key}>
          <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: 500, fontSize: '0.9rem' }}>
            {field.label}
            {field.required && <span style={{ color: '#c62828', marginLeft: '0.2rem' }}>*</span>}
          </label>

          {readOnly ? (
            <div style={{ padding: '0.5rem 0.75rem', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.9rem', minHeight: '2rem' }}>
              {values[field.key] || '-'}
            </div>
          ) : (
            <>
              {field.type === 'text' && (
                <input
                  type="text"
                  value={values[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  value={values[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={values[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              )}

              {field.type === 'select' && (
                <select
                  value={values[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                >
                  <option value="">선택해주세요</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={values[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
