/**
 * @file ContactsHeader.tsx
 * @description Header za Contacts stran z menijem
 */

import { MoreVertical, Download, CheckSquare, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface ContactsHeaderProps {
  companyCount: number;
  onExportAll: () => void;
  onStartSelection: () => void;
  onStartDeletion: () => void;
}

export function ContactsHeader({
  companyCount,
  onExportAll,
  onStartSelection,
  onStartDeletion,
}: ContactsHeaderProps) {
  return (
    <div className="bg-blue-600 text-white p-4 shadow">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stranke</h1>
          <div className="text-sm opacity-80">{companyCount} strank</div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="p-2 hover:bg-blue-500 rounded-lg"
            aria-label="Več možnosti"
          >
            <MoreVertical size={22} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onExportAll}>
              <Download className="mr-2" size={16} />
              Izvozi vse kontakte (vCard)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onStartSelection}>
              <CheckSquare className="mr-2" size={16} />
              Izberi kontakte za izvoz
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onStartDeletion} className="text-red-600">
              <Trash2 className="mr-2" size={16} />
              Izberi kontakte za brisanje
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
