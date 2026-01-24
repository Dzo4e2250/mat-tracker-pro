/**
 * @file SelectTypeModal.tsx
 * @description Modal za izbiro tipa predpražnika
 */

interface MatType {
  id: string;
  name: string;
  code?: string;
  category: string;
  width_cm: number;
  height_cm: number;
}

interface SelectTypeModalProps {
  qrCode: string;
  matTypes: MatType[] | undefined;
  isPending: boolean;
  onSelect: (qrId: string, typeId: string) => void;
  onCancel: () => void;
}

export default function SelectTypeModal({
  qrCode,
  matTypes,
  isPending,
  onSelect,
  onCancel,
}: SelectTypeModalProps) {
  return (
    <div>
      <h3 className="text-lg font-bold mb-4">Izberi tip ({qrCode}):</h3>
      {matTypes?.filter(t => t.category !== 'design').map(type => (
        <button
          key={type.id}
          onClick={() => onSelect(type.id, type.id)}
          disabled={isPending}
          className="w-full p-3 border rounded mb-2 text-left hover:bg-gray-50 disabled:opacity-50"
        >
          <div className="font-medium">{type.code || type.name}</div>
          <div className="text-sm text-gray-600">{type.width_cm}x{type.height_cm} cm</div>
        </button>
      ))}
      <button onClick={onCancel} className="w-full mt-4 py-2 border rounded">
        Prekliči
      </button>
    </div>
  );
}
