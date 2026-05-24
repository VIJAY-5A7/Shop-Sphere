import { useState } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { useListAddresses, useCreateAddress, useUpdateAddress, useDeleteAddress, useGetMe, getListAddressesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Edit2, Trash2, LogOut, User, Mail, Shield } from "lucide-react";

const EMPTY_ADDR = { name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India", isDefault: false };

export function Profile() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me } = useGetMe();
  const { data: addresses, isLoading: loadingAddr } = useListAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();

  const [dialog, setDialog] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ADDR });

  function openAdd() {
    setForm({ ...EMPTY_ADDR });
    setEditingId(null);
    setDialog("add");
  }

  function openEdit(addr: any) {
    setForm({ name: addr.name, phone: addr.phone, line1: addr.line1, line2: addr.line2 ?? "", city: addr.city, state: addr.state, pincode: addr.pincode, country: addr.country, isDefault: addr.isDefault });
    setEditingId(addr.id);
    setDialog("edit");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (dialog === "add") {
      createAddress.mutate(
        { data: form },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
            setDialog(null);
            toast({ title: "Address added" });
          },
        }
      );
    } else if (dialog === "edit" && editingId) {
      updateAddress.mutate(
        { addressId: editingId, data: form },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
            setDialog(null);
            toast({ title: "Address updated" });
          },
        }
      );
    }
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this address?")) return;
    deleteAddress.mutate(
      { addressId: id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() }) }
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Profile card */}
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-4 ring-primary/20" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={36} className="text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user?.fullName || "User"}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Mail size={14} />
              <span>{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
            {me?.role && me.role !== "customer" && (
              <div className="flex items-center gap-2 mt-2">
                <Shield size={14} className="text-primary" />
                <Badge variant="secondary" className="capitalize">{me.role}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="bg-card border rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg flex items-center gap-2"><MapPin size={18} /> Saved Addresses</h2>
          <Button size="sm" onClick={openAdd} variant="outline" className="gap-1">
            <Plus size={14} /> Add Address
          </Button>
        </div>

        {loadingAddr ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : addresses?.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <MapPin size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No addresses saved yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses?.map(addr => (
              <div key={addr.id} className="border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{addr.name}</span>
                    <span className="text-muted-foreground text-xs">{addr.phone}</span>
                    {addr.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                  <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}, {addr.country}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(addr)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(addr.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full border-red-200 text-red-600 hover:bg-red-50 gap-2"
        onClick={() => signOut()}
      >
        <LogOut size={16} /> Sign Out
      </Button>

      {/* Address Dialog */}
      <Dialog open={!!dialog} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === "add" ? "Add New Address" : "Edit Address"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-sm mb-1 block">Full Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label className="text-sm mb-1 block">Phone</Label><Input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label className="text-sm mb-1 block">Address Line 1</Label><Input required value={form.line1} onChange={e => setForm(f => ({ ...f, line1: e.target.value }))} /></div>
            <div><Label className="text-sm mb-1 block">Address Line 2 (optional)</Label><Input value={form.line2} onChange={e => setForm(f => ({ ...f, line2: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-sm mb-1 block">City</Label><Input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label className="text-sm mb-1 block">State</Label><Input required value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} /></div>
              <div><Label className="text-sm mb-1 block">Pincode</Label><Input required value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
              <Label htmlFor="isDefault" className="text-sm cursor-pointer">Set as default address</Label>
            </div>
            <Button type="submit" className="w-full" disabled={createAddress.isPending || updateAddress.isPending}>
              {createAddress.isPending || updateAddress.isPending ? "Saving..." : dialog === "add" ? "Save Address" : "Update Address"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
