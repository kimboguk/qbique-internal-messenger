import { useState } from 'react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !tags.includes(value)) {
        onChange([...tags, value]);
      }
      setInputValue('');
    }
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.4rem',
      border: '1px solid #ddd', borderRadius: '4px', minHeight: '2.5rem', alignItems: 'center',
    }}>
      {tags.map((tag, index) => (
        <span
          key={index}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.2rem 0.5rem', background: '#e3f2fd', color: '#1565c0',
            borderRadius: '12px', fontSize: '0.8rem',
          }}
        >
          {tag}
          <button
            onClick={() => removeTag(index)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#1565c0', fontSize: '0.9rem', padding: 0, lineHeight: 1,
            }}
          >
            &times;
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
        style={{
          border: 'none', outline: 'none', flex: 1, minWidth: '80px',
          padding: '0.2rem', fontSize: '0.85rem',
        }}
      />
    </div>
  );
}
