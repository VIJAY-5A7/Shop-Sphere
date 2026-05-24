import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetCart, useListAddresses, useCreateAddress, useValidateCoupon,
  useCreateOrder, getGetCartQueryKey, getListAddressesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Tag, CheckCircle, CreditCard, Truck, Smartphone } from "lucide-react";
import { AddressCard } from "@/components/AddressCard";

const STEPS = ["Address", "Payment", "Review"];

export function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi" | "card">("cod");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India", isDefault: false });

  const { data: cart } = useGetCart();
  const { data: addresses } = useListAddresses();
  const validateCoupon = useValidateCoupon();
  const createAddress = useCreateAddress();
  const createOrder = useCreateOrder();

  const subtotal = cart?.total ?? 0;
  const discountFromCoupon = appliedCoupon?.discountAmount ?? 0;
  const gst = Math.round(subtotal * 0.18);
  const shipping = subtotal > 499 ? 0 : 49;
  const total = Math.round((subtotal - discountFromCoupon + gst + shipping) * 100) / 100;

  async function handleValidateCoupon() {
    validateCoupon.mutate(
      { data: { code: couponCode, orderAmount: subtotal } },
      {
        onSuccess: (data) => {
          if (data.valid) {
            setAppliedCoupon({ code: couponCode, discountAmount: data.discountAmount });
            toast({ title: "Coupon applied!", description: `You saved ₹${data.discountAmount.toLocaleString("en-IN")}` });
          } else {
            toast({ variant: "destructive", title: "Invalid coupon", description: data.message });
          }
        },
      }
    );
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    createAddress.mutate(
      { data: newAddr },
      {
        onSuccess: (addr) => {
          queryClient.invalidateQueries({ queryKey: getListAddressesQueryKey() });
          setSelectedAddress(addr.id);
          setAddingAddress(false);
          setNewAddr({ name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India", isDefault: false });
        },
      }
    );
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) { toast({ variant: "destructive", title: "Select a delivery address" }); return; }
    createOrder.mutate(
      { data: { addressId: selectedAddress, paymentMethod, couponCode: appliedCoupon?.code } },
      {
        onSuccess: (order) => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Order placed successfully!" });
          setLocation(`/orders/${order.id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to place order", description: "Please try again." });
        },
      }
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button className="mt-4" onClick={() => setLocation("/shop")}>Go Shopping</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <CheckCircle size={16} /> : i + 1}
            </div>
            <span className={`text-sm hidden md:inline ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-12 h-0.5 mx-1 ${i < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Step 0: Address */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-4">Select Delivery Address</h2>
              {addresses?.map(addr => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr.id)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${selectedAddress === addr.id ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/50"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <MapPin size={18} className={selectedAddress === addr.id ? "text-primary mt-0.5" : "text-muted-foreground mt-0.5"} />
                      <div>
                        <p className="font-semibold">{addr.name} <span className="font-normal text-muted-foreground text-sm">{addr.phone}</span></p>
                        <p className="text-sm text-muted-foreground">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                        <p className="text-sm text-muted-foreground">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-sm text-muted-foreground">{addr.country}</p>
                      </div>
                    </div>
                    {addr.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                </div>
              ))}

              <Dialog open={addingAddress} onOpenChange={setAddingAddress}>
                <DialogTrigger asChild>
                  <button className="w-full border-2 border-dashed rounded-xl p-4 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-medium">
                    <Plus size={18} /> Add New Address
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add New Address</DialogTitle></DialogHeader>
                  <form onSubmit={handleAddAddress} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm mb-1 block">Full Name</Label>
                        <Input required value={newAddr.name} onChange={e => setNewAddr(a => ({ ...a, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Phone</Label>
                        <Input required value={newAddr.phone} onChange={e => setNewAddr(a => ({ ...a, phone: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">Address Line 1</Label>
                      <Input required value={newAddr.line1} onChange={e => setNewAddr(a => ({ ...a, line1: e.target.value }))} />
                    </div>
                    <div>
                      <Label className="text-sm mb-1 block">Address Line 2 (optional)</Label>
                      <Input value={newAddr.line2} onChange={e => setNewAddr(a => ({ ...a, line2: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-sm mb-1 block">City</Label>
                        <Input required value={newAddr.city} onChange={e => setNewAddr(a => ({ ...a, city: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">State</Label>
                        <Input required value={newAddr.state} onChange={e => setNewAddr(a => ({ ...a, state: e.target.value }))} />
                      </div>
                      <div>
                        <Label className="text-sm mb-1 block">Pincode</Label>
                        <Input required value={newAddr.pincode} onChange={e => setNewAddr(a => ({ ...a, pincode: e.target.value }))} />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={createAddress.isPending}>
                      {createAddress.isPending ? "Saving..." : "Save Address"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Button
                className="w-full mt-4"
                disabled={!selectedAddress}
                onClick={() => setStep(1)}
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="font-semibold text-lg mb-4">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)} className="space-y-3">
                <label className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === "cod" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/50"}`}>
                  <RadioGroupItem value="cod" />
                  <Truck size={20} className="text-orange-500" />
                  <div>
                    <p className="font-semibold">Cash on Delivery</p>
                    <p className="text-xs text-muted-foreground">Pay when you receive your order</p>
                  </div>
                </label>
                <label className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === "upi" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/50"}`}>
                  <RadioGroupItem value="upi" />
                  <Smartphone size={20} className="text-purple-500" />
                  <div>
                    <p className="font-semibold">UPI Payment</p>
                    <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm & more</p>
                  </div>
                </label>
                <label className={`flex items-center gap-4 border rounded-xl p-4 cursor-pointer transition-all ${paymentMethod === "card" ? "border-primary ring-2 ring-primary/20 bg-primary/5" : "hover:border-primary/50"}`}>
                  <RadioGroupItem value="card" />
                  <CreditCard size={20} className="text-blue-500" />
                  <div>
                    <p className="font-semibold">Credit / Debit Card</p>
                    <p className="text-xs text-muted-foreground">All major cards accepted</p>
                  </div>
                </label>
              </RadioGroup>

              {/* Coupon */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag size={16} /> Apply Coupon</h3>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={16} />
                      <span className="font-semibold">{appliedCoupon.code}</span>
                      <span className="text-sm">- ₹{appliedCoupon.discountAmount.toLocaleString("en-IN")} off</span>
                    </div>
                    <button onClick={() => setAppliedCoupon(null)} className="text-sm text-red-500 hover:underline">Remove</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    />
                    <Button
                      variant="outline"
                      onClick={handleValidateCoupon}
                      disabled={!couponCode || validateCoupon.isPending}
                    >
                      Apply
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">Try: WELCOME20 or FLAT200</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(2)}>Review Order</Button>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="font-semibold text-lg mb-4">Review Your Order</h2>
              <div className="bg-muted/50 border rounded-xl p-4 space-y-3">
                {cart.items.map(item => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="w-12 h-12 rounded-lg bg-muted shrink-0 flex items-center justify-center text-lg font-bold text-primary/30">
                      {item.productTitle?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium line-clamp-1">{item.productTitle}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity} × ₹{item.finalPrice.toLocaleString("en-IN")}</p>
                    </div>
                    <span className="font-semibold">₹{(item.finalPrice * item.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>

              {selectedAddress && (() => {
                const addr = addresses?.find(a => a.id === selectedAddress);
                if (!addr) return null;
                return (
                  <div className="text-sm p-3 bg-muted/50 border rounded-xl">
                    <p className="font-semibold mb-1 flex items-center gap-2"><MapPin size={14} /> Delivery Address</p>
                    <p>{addr.name} · {addr.phone}</p>
                    <p className="text-muted-foreground">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
                  </div>
                );
              })()}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={handlePlaceOrder} disabled={createOrder.isPending}>
                  {createOrder.isPending ? "Placing Order..." : "Place Order"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="bg-card border rounded-xl p-6 h-fit">
          <h3 className="font-bold mb-4">Price Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price ({cart.itemCount} items)</span>
              <span>₹{cart.subtotal.toLocaleString("en-IN")}</span>
            </div>
            {cart.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Product Discount</span>
                <span>-₹{cart.discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {discountFromCoupon > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon ({appliedCoupon?.code})</span>
                <span>-₹{discountFromCoupon.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>GST (18%)</span>
              <span>₹{gst.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping</span>
              <span>{shipping === 0 ? <span className="text-green-600 font-medium">FREE</span> : `₹${shipping}`}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>₹{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
          {(cart.discountAmount + discountFromCoupon) > 0 && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg text-green-700 text-xs text-center font-medium">
              Total savings: ₹{(cart.discountAmount + discountFromCoupon).toLocaleString("en-IN")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
