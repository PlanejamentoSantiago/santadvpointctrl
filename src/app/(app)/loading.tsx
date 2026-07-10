export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-10 h-10 border-4 border-line border-t-brand rounded-full spin-ic" />
      <div className="text-muted font-medium">Carregando painel...</div>
    </div>
  );
}
