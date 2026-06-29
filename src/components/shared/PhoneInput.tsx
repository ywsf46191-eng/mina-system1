interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

/** Phone field with a fixed +972 country prefix. Stores the full value
 *  (e.g. "+972591234567"); the visible input holds the subscriber part only. */
export function PhoneInput({ value, onChange, placeholder = '5xxxxxxxx', error }: Props) {
  const local = value.replace(/^\+972/, '').replace(/^0+/, '');

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
    onChange(digits ? `+972${digits}` : '');
  };

  return (
    <div>
      <div
        dir="ltr"
        className={`flex items-stretch rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 ${error ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}`}
      >
        <span className="flex items-center px-3 bg-slate-100 dark:bg-slate-600 text-sm font-semibold text-slate-600 dark:text-slate-200 select-none">
          +972
        </span>
        <input
          type="tel"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2.5 text-sm text-slate-800 dark:text-white dark:bg-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
