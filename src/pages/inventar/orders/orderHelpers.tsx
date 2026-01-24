import { Badge } from '@/components/ui/badge';
import { Clock, Check, Truck, CheckCircle, X } from 'lucide-react';

export function formatDate(dateString: string | null) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Čaka odobritev
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          <Check className="h-3 w-3 mr-1" />
          Odobreno
        </Badge>
      );
    case 'shipped':
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          <Truck className="h-3 w-3 mr-1" />
          Odposlano
        </Badge>
      );
    case 'received':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Prejeto
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive">
          <X className="h-3 w-3 mr-1" />
          Zavrnjeno
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}
