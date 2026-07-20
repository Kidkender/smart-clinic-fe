export default function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-[13px] font-medium text-[#dc3545]">{message}</p>;
}
