export const Dropdown = ({ options, value, onChange }) => (
  <select
    value={value}
    onChange={onChange}
    className="p-2 border border-gray-300 rounded text-sm h-8 focus:ring-indigo-500 focus:border-indigo-500"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);
