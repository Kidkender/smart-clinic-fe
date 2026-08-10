import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover';
import { searchPatients } from '@/api/patient';

interface PatientResult {
  ID: number;
  Fullname: string;
  MRN: string;
  Phone?: string;
}

const DEBOUNCE_MS = 300;

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      searchPatients({ q: trimmed, limit: 8 })
        .then(r => {
          setResults(r.data ?? []);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const goToPatient = (id: number) => {
    setOpen(false);
    setQuery('');
    navigate(`/patients/${id}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-80">
          <Icon icon="fa6-solid:magnifying-glass" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm text-[#9aa7b2]" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            placeholder="Tìm bệnh nhân theo tên hoặc mã hồ sơ…"
            className="h-10 w-full rounded-xl border border-[#e8edf2] bg-[#f4f7fa] pr-3.5 pl-9.5 text-sm outline-none focus:border-[#307bc4] focus:bg-white"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-80 p-0" onOpenAutoFocus={e => e.preventDefault()}>
        {loading ? (
          <div className="p-4 text-center text-sm text-[#6c757d]">Đang tìm…</div>
        ) : results.length === 0 ? (
          <div className="p-4 text-center text-sm text-[#6c757d]">Không tìm thấy bệnh nhân.</div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {results.map(p => (
              <button
                key={p.ID}
                type="button"
                onClick={() => goToPatient(p.ID)}
                className="flex w-full cursor-pointer items-center justify-between gap-2 border-b border-[#f0f4f8] px-4 py-2.5 text-left last:border-0 hover:bg-[#f4f7fa]"
              >
                <span className="truncate text-sm font-medium text-[#274760]">{p.Fullname}</span>
                <span className="shrink-0 text-xs text-[#9aa7b2]">{p.MRN}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
