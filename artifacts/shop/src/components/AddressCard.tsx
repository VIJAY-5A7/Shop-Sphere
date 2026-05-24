import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Address } from "@workspace/api-client-react";
import { MapPin, Phone, Trash2, Edit2 } from "lucide-react";

interface AddressCardProps {
  address: Address;
  onEdit?: (address: Address) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number) => void;
  selected?: boolean;
  selectable?: boolean;
}

export function AddressCard({ address, onEdit, onDelete, onSelect, selected, selectable }: AddressCardProps) {
  return (
    <Card 
      className={`relative overflow-hidden transition-all ${selectable ? 'cursor-pointer hover:border-primary/50' : ''} ${selected ? 'border-primary shadow-md ring-1 ring-primary/20' : ''}`}
      onClick={() => selectable && onSelect && onSelect(address.id)}
    >
      {address.isDefault && (
        <Badge className="absolute top-3 right-3 bg-secondary text-secondary-foreground pointer-events-none">
          Default
        </Badge>
      )}
      
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-primary/70">
            <MapPin size={20} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-semibold text-lg">{address.name}</div>
            
            <p className="text-sm text-muted-foreground mt-1">
              {address.line1}
              {address.line2 && <><br />{address.line2}</>}
              <br />
              {address.city}, {address.state} {address.pincode}
              <br />
              {address.country}
            </p>
            
            <div className="flex items-center gap-2 text-sm text-foreground mt-3 font-medium">
              <Phone size={14} className="text-muted-foreground" />
              {address.phone}
            </div>
            
            {(!selectable || onEdit || onDelete) && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(address); }}>
                    <Edit2 size={14} className="mr-1" /> Edit
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDelete(address.id); }}>
                    <Trash2 size={14} className="mr-1" /> Delete
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
