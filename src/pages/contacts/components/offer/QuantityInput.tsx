import { useState, useEffect } from 'react';

interface QuantityInputProps {
  value: number;
  onChange: (n: number) => void;
  className?: string;
}

export default function QuantityInput({ value, onChange, className = '' }: QuantityInputProps) {
  const [raw, setRaw] = useState(value === 0 ? '' : String(value));

  useEffect(() => {
    setRaw(value === 0 ? '' : String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '' || val === '-') {
          setRaw(val);
          return;
        }
        const num = parseInt(val);
        if (!isNaN(num)) {
          setRaw(val);
          onChange(num);
        }
      }}
      onBlur={() => {
        const num = parseInt(raw);
        if (isNaN(num) || num === 0) {
          onChange(1);
          setRaw('1');
        }
      }}
      className={`${className} ${value < 0 ? 'border-red-400 bg-red-50 text-red-700' : ''}`}
    />
  );
}
