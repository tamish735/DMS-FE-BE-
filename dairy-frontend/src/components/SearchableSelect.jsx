import { useState } from "react";

function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Select",
  labelKey = "name",
  valueKey = "id",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = options.filter((opt) =>
    opt[labelKey]?.toLowerCase().includes(query.toLowerCase())
  );

  const selected = options.find(
    (o) => String(o[valueKey]) === String(value)
  );

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        type="text"
        placeholder={placeholder}
        value={selected ? selected[labelKey] : query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        style={{ width: "100%", padding: "6px" }}
      />

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ccc",
            maxHeight: "180px",
            overflowY: "auto",
            zIndex: 999,
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "6px", color: "gray" }}>
              No results
            </div>
          )}

          {filtered.map((opt) => (
            <div
              key={opt[valueKey]}
              onClick={() => {
                onChange(opt[valueKey]);
                setQuery("");
                setOpen(false);
              }}
              style={{
                padding: "6px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
            >
              {opt[labelKey]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;