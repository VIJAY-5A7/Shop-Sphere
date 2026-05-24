import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetProduct, useGetProductReviews, useAddToCart, useAddToWishlist,
  useCreateReview, useListOrders, getGetCartQueryKey, getGetWishlistQueryKey,
  getGetProductReviewsQueryKey, getGetProductQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Heart, Minus, Plus, Star, Truck, ShieldCheck } from "lucide-react";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [qty, setQty] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: product, isLoading } = useGetProduct(productId, {
    query: { enabled: !!productId, queryKey: getGetProductQueryKey(productId) },
  });
  const { data: reviews } = useGetProductReviews({ productId });
  const { data: orders } = useListOrders();
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const createReview = useCreateReview();

  const hasOrdered = orders?.orders.some(o =>
    o.items.some(i => i.productId === productId) && o.status === "delivered"
  );

  function handleAddToCart() {
    addToCart.mutate(
      { data: { productId, quantity: qty } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to cart" });
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

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Image */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl bg-muted overflow-hidden flex items-center justify-center border">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-primary/10 flex items-center justify-center text-primary/30 text-[120px] font-bold uppercase">
                {product.brand?.[0] || product.title?.[0]}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <p className="text-sm text-primary font-semibold uppercase tracking-wider mb-1">{product.brand}</p>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <StarRating rating={product.avgRating} size={18} />
            <span className="text-sm text-muted-foreground">{product.reviewCount} reviews</span>
          </div>

          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold">₹{product.finalPrice.toLocaleString("en-IN")}</span>
            {product.discountPercent > 0 && (
              <>
                <span className="text-xl text-muted-foreground line-through">₹{product.price.toLocaleString("en-IN")}</span>
                <Badge variant="destructive" className="text-sm font-bold">{product.discountPercent}% OFF</Badge>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {product.stock > 0 ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">In Stock ({product.stock} left)</Badge>
            ) : (
              <Badge variant="destructive">Out of Stock</Badge>
            )}
          </div>

          <p className="text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Quantity + Actions */}
          {product.stock > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Quantity:</Label>
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="px-4 py-2 font-semibold min-w-[40px] text-center">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(product.stock, q + 1))}
                    className="px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                  disabled={addToCart.isPending}
                >
                  <ShoppingCart size={20} />
                  {addToCart.isPending ? "Adding..." : "Add to Cart"}
                </Button>
                <Button size="lg" variant="outline" onClick={handleWishlist} disabled={addToWishlist.isPending}>
                  <Heart size={20} />
                </Button>
              </div>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => {
                handleAddToCart();
                setTimeout(() => setLocation("/cart"), 500);
              }}>
                Buy Now
              </Button>
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck size={16} className="text-green-600" />
              <span>Free delivery above ₹499</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck size={16} className="text-blue-600" />
              <span>7-day return policy</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Sold by <span className="font-medium text-foreground">{product.sellerName}</span> · Category: <span className="font-medium text-foreground">{product.categoryName}</span>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16 border-t pt-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Customer Reviews</h2>
          {hasOrdered && !showReviewForm && (
            <Button onClick={() => setShowReviewForm(true)} variant="outline">
              Write a Review
            </Button>
          )}
        </div>

        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="bg-muted/50 border rounded-xl p-6 mb-8 space-y-4">
            <h3 className="font-semibold">Your Review</h3>
            <div>
              <Label className="text-sm mb-2 block">Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(r => (
                  <button key={r} type="button" onClick={() => setReviewRating(r)} className="p-1">
                    <Star
                      size={24}
                      className={r <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground"}
                    />
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
          <div className="space-y-6">
            {reviews.map(r => (
              <div key={r.id} className="border-b pb-6 last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StarRating rating={r.rating} size={14} />
                      <span className="font-semibold text-sm">{r.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.userName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{r.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this product!</p>
        )}
      </div>
    </div>
  );
}
