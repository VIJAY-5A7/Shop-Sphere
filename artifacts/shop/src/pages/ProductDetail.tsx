import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProduct, useGetProductReviews, useAddToCart, useAddToWishlist,
  useCreateReview, useListOrders, useListProducts, getGetCartQueryKey, getGetWishlistQueryKey,
  getGetProductReviewsQueryKey, getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { ProductCard } from "@/components/ProductCard";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, Heart, Minus, Plus, Star, Truck, ShieldCheck,
  MapPin, ChevronDown, ChevronUp, Zap, BadgeCheck, RotateCcw, CreditCard,
} from "lucide-react";

const BANK_OFFERS = [
  { icon: "🏦", text: "10% off on HDFC Bank Credit Cards. Max discount ₹1,500. T&C apply." },
  { icon: "💳", text: "5% Unlimited Cashback on Axis Bank Credit Cards. T&C apply." },
  { icon: "🎯", text: "No Cost EMI on Bajaj Finserv EMI Card on orders above ₹3,000." },
  { icon: "📱", text: "Extra 5% off on first purchase with ShopWave Pay." },
];

function generateHighlights(product: { brand: string; categoryName?: string; discountPercent: number; stock: number }) {
  const base = [
    `Brand: ${product.brand} — Verified Seller`,
    `${product.discountPercent > 0 ? product.discountPercent + "% savings on MRP" : "Best price guaranteed"}`,
    "7-day hassle-free return & exchange",
    "Free shipping on orders above ₹499",
  ];
  if (product.stock <= 10 && product.stock > 0) base.unshift(`⚡ Only ${product.stock} left in stock — order soon!`);
  return base;
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [pincode, setPincode] = useState("");
  const [deliveryMsg, setDeliveryMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showOffers, setShowOffers] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: reviews } = useGetProductReviews({ productId });
  const { data: orders } = useListOrders();
  const { data: allProducts } = useListProducts({ limit: 20 });
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const createReview = useCreateReview();

  const hasOrdered = orders?.orders.some(o =>
    o.items.some(i => i.productId === productId) && o.status === "delivered"
  );

  const related = allProducts?.products
    .filter(p => p.id !== productId && p.categoryName === product?.categoryName)
    .slice(0, 5) ?? [];

  function handleAddToCart() {
    addToCart.mutate(
      { data: { productId, quantity: qty } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to cart", description: `${product?.title} × ${qty}` });
        },
      }
    );
  }

  function handleBuyNow() {
    addToCart.mutate(
      { data: { productId, quantity: qty } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setLocation("/checkout");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Could not proceed to checkout." });
        },
      }
    );
  }

  function handleWishlist() {
    addToWishlist.mutate(
      { data: { productId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
          toast({ title: "Saved to wishlist" });
        },
      }
    );
  }

  function checkDelivery() {
    if (pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      setDeliveryMsg({ ok: false, text: "Enter a valid 6-digit pincode." });
      return;
    }
    const tomorrow = new Date(Date.now() + 86400000);
    const dayAfter = new Date(Date.now() + 2 * 86400000);
    const fmt = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
    const isFree = product ? parseFloat(String(product.finalPrice)) >= 499 : false;
    setDeliveryMsg({
      ok: true,
      text: `Delivery by ${fmt(tomorrow)}–${fmt(dayAfter)} · ${isFree ? "FREE Delivery" : "₹49 shipping"}`,
    });
  }

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    createReview.mutate(
      { data: { rating: reviewRating, title: reviewTitle, body: reviewBody } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProductReviewsQueryKey({ productId, page: 1 }) });
          setShowReviewForm(false);
          setReviewTitle(""); setReviewBody(""); setReviewRating(5);
          toast({ title: "Review submitted!" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="w-3/4 h-8" />
            <Skeleton className="w-1/2 h-6" />
            <Skeleton className="w-1/3 h-10" />
            <Skeleton className="w-full h-24" />
          </div>
        </div>
      </div>
    );
  }
  if (!product) return <div className="p-8 text-center text-muted-foreground">Product not found.</div>;

  const finalPrice = parseFloat(String(product.finalPrice));
  const origPrice = parseFloat(String(product.price));
  const emiFrom = Math.round(finalPrice / 12);
  const images = product.images && product.images.length > 0 ? product.images : [];
  const highlights = generateHighlights(product);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto px-4 py-6">

        {/* Main product section */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden mb-6">
          <div className="grid md:grid-cols-2 gap-0">

            {/* Left: Image gallery */}
            <div className="p-6 border-r">
              {/* Main image */}
              <div className="aspect-square rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center mb-4 border">
                {images[activeImg] ? (
                  <img
                    src={images[activeImg]}
                    alt={product.title}
                    className="w-full h-full object-contain p-6"
                  />
                ) : (
                  <div className="text-primary/20 text-[120px] font-bold uppercase select-none">
                    {product.brand?.[0] || product.title?.[0]}
                  </div>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-3 justify-center">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 rounded-lg border-2 overflow-hidden flex items-center justify-center bg-gray-50 transition-all ${
                        i === activeImg ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img src={img} alt={`View ${i + 1}`} className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
              {/* Action buttons below image */}
              <div className="flex gap-3 mt-6">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending || product.stock === 0}
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  className="flex-1 gap-2 bg-[#ff9f00] hover:bg-[#e68f00] text-white border-0 font-bold"
                  onClick={handleBuyNow}
                  disabled={addToCart.isPending || product.stock === 0}
                >
                  <Zap size={18} />
                  Buy Now
                </Button>
              </div>
            </div>

            {/* Right: Product info */}
            <div className="p-6 space-y-4">
              {/* Brand + Title */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-primary font-bold uppercase tracking-wider">{product.brand}</span>
                  <BadgeCheck size={16} className="text-blue-500" />
                </div>
                <h1 className="text-2xl font-bold text-foreground leading-snug">{product.title}</h1>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-green-600 text-white px-2 py-0.5 rounded text-sm font-bold">
                  <span>{product.avgRating > 0 ? product.avgRating.toFixed(1) : "New"}</span>
                  {product.avgRating > 0 && <Star size={12} className="fill-white" />}
                </div>
                <span className="text-sm text-muted-foreground">{product.reviewCount} ratings</span>
                <span className="text-xs text-muted-foreground">· Sold by <strong className="text-foreground">{product.sellerName}</strong></span>
              </div>

              <hr />

              {/* Price */}
              <div>
                {product.discountPercent > 0 && (
                  <p className="text-sm text-green-600 font-semibold mb-0.5">{product.discountPercent}% off</p>
                )}
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold">₹{Math.round(finalPrice).toLocaleString("en-IN")}</span>
                  {product.discountPercent > 0 && (
                    <span className="text-lg text-muted-foreground line-through">
                      ₹{Math.round(origPrice).toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Inclusive of all taxes</p>
                {emiFrom > 0 && finalPrice > 1999 && (
                  <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                    <CreditCard size={14} />
                    EMI starts from <strong>₹{emiFrom.toLocaleString("en-IN")}/month</strong>
                  </p>
                )}
              </div>

              {/* Bank Offers */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <button
                  onClick={() => setShowOffers(v => !v)}
                  className="flex items-center justify-between w-full text-sm font-semibold text-blue-700"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard size={16} />
                    {BANK_OFFERS.length} Bank Offers Available
                  </span>
                  {showOffers ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showOffers && (
                  <ul className="mt-3 space-y-2">
                    {BANK_OFFERS.map((o, i) => (
                      <li key={i} className="flex gap-2 text-xs text-blue-800">
                        <span>{o.icon}</span>
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Highlights */}
              <div>
                <h3 className="font-semibold text-sm mb-2">Highlights</h3>
                <ul className="space-y-1.5">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <hr />

              {/* Delivery / Pincode */}
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin size={15} className="text-muted-foreground" /> Delivery
                </h3>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter pincode"
                    value={pincode}
                    onChange={e => { setPincode(e.target.value.replace(/\D/g, "")); setDeliveryMsg(null); }}
                    className="w-36 h-9 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={checkDelivery} className="h-9 text-primary border-primary">
                    Check
                  </Button>
                </div>
                {deliveryMsg && (
                  <p className={`text-xs mt-1.5 flex items-center gap-1 ${deliveryMsg.ok ? "text-green-600" : "text-red-500"}`}>
                    {deliveryMsg.ok ? <Truck size={13} /> : null}
                    {deliveryMsg.text}
                  </p>
                )}
              </div>

              {/* Stock + Quantity */}
              {product.stock > 0 ? (
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                    <div className="flex items-center border rounded-lg overflow-hidden w-fit">
                      <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-muted transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="px-4 py-2 font-semibold min-w-[40px] text-center">{qty}</span>
                      <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="px-3 py-2 hover:bg-muted transition-colors">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Availability</p>
                    {product.stock <= 5 ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Only {product.stock} left!</Badge>
                    ) : (
                      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">In Stock</Badge>
                    )}
                  </div>
                </div>
              ) : (
                <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
              )}

              {/* Wishlist */}
              <button
                onClick={handleWishlist}
                disabled={addToWishlist.isPending}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Heart size={16} />
                Save to Wishlist
              </button>

              {/* Trust row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { icon: <Truck size={15} className="text-green-600" />, label: "Free Delivery", sub: "Orders above ₹499" },
                  { icon: <RotateCcw size={15} className="text-blue-600" />, label: "Easy Returns", sub: "7-day policy" },
                  { icon: <ShieldCheck size={15} className="text-purple-600" />, label: "Secure Pay", sub: "100% authentic" },
                ].map(({ icon, label, sub }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-1 bg-muted/40 rounded-xl p-2">
                    {icon}
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[10px] text-muted-foreground">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Product Description</h2>
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        {/* Reviews */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Customer Reviews</h2>
            {hasOrdered && !showReviewForm && (
              <Button onClick={() => setShowReviewForm(true)} variant="outline" size="sm">
                Write a Review
              </Button>
            )}
          </div>

          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="bg-muted/50 border rounded-xl p-5 mb-6 space-y-4">
              <h3 className="font-semibold">Your Review</h3>
              <div>
                <Label className="text-sm mb-2 block">Rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button key={r} type="button" onClick={() => setReviewRating(r)} className="p-1">
                      <Star size={24} className={r <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="rtitle" className="text-sm mb-1 block">Title</Label>
                <Input id="rtitle" value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} required placeholder="Summarize your experience" />
              </div>
              <div>
                <Label htmlFor="rbody" className="text-sm mb-1 block">Review</Label>
                <Textarea id="rbody" value={reviewBody} onChange={e => setReviewBody(e.target.value)} required rows={4} placeholder="What did you like or dislike?" />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={createReview.isPending}>{createReview.isPending ? "Submitting..." : "Submit Review"}</Button>
                <Button type="button" variant="outline" onClick={() => setShowReviewForm(false)}>Cancel</Button>
              </div>
            </form>
          )}

          {reviews && reviews.length > 0 ? (
            <div className="space-y-5">
              {reviews.map(r => (
                <div key={r.id} className="border-b pb-5 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1 bg-green-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                      {r.rating} <Star size={10} className="fill-white" />
                    </div>
                    <span className="font-semibold text-sm">{r.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{r.userName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                  <p className="text-sm text-muted-foreground">{r.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this product!</p>
          )}
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">More from {product.categoryName}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
