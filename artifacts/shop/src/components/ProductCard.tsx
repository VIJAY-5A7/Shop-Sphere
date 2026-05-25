import { Link, useLocation } from "wouter";
import { ShoppingCart, Heart, Zap } from "lucide-react";
import { Product } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { useAddToCart, getGetCartQueryKey, useAddToWishlist, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart();
  const addToWishlist = useAddToWishlist();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const finalPrice = parseFloat(String(product.finalPrice));
  const origPrice = parseFloat(String(product.price));

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to Cart", description: product.title });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to add to cart." });
        },
      }
    );
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          setLocation("/checkout");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Failed to proceed." });
        },
      }
    );
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToWishlist.mutate(
      { data: { productId: product.id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() });
          toast({ title: "Saved to Wishlist" });
        },
      }
    );
  };

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col relative">
        {/* Badges */}
        {product.discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-[11px] font-bold px-2 py-0.5 rounded">
            {product.discountPercent}% OFF
          </div>
        )}
        {product.isFlashSale && (
          <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-yellow-900 text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <Zap size={10} className="fill-yellow-900" />
            DEAL
          </div>
        )}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 backdrop-blur rounded-full text-slate-400 hover:text-rose-500 hover:bg-white shadow-sm transition-colors"
        >
          <Heart size={16} />
        </button>

        {/* Image */}
        <div className="aspect-square bg-white relative overflow-hidden flex items-center justify-center p-4">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-primary/10 flex items-center justify-center text-primary/30 text-6xl font-bold uppercase">
              {product.brand?.[0] || product.title?.[0] || "P"}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-grow border-t bg-card">
          <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">{product.brand}</div>
          <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors leading-snug">
            {product.title}
          </h3>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <StarRating rating={product.avgRating} />
              <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
            </div>
          )}

          {/* Stock urgency */}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-[11px] text-red-500 font-semibold mb-1">Only {product.stock} left!</p>
          )}

          {/* Price */}
          <div className="mt-auto mb-3">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-bold text-base">₹{Math.round(finalPrice).toLocaleString("en-IN")}</span>
              {product.discountPercent > 0 && (
                <>
                  <span className="text-xs text-muted-foreground line-through">₹{Math.round(origPrice).toLocaleString("en-IN")}</span>
                  <span className="text-xs text-green-600 font-semibold">{product.discountPercent}% off</span>
                </>
              )}
            </div>
            {finalPrice >= 499 && (
              <p className="text-[11px] text-green-600 mt-0.5">FREE Delivery</p>
            )}
          </div>

          {/* Buttons */}
          {product.stock > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1 border-primary text-primary hover:bg-primary hover:text-white"
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
              >
                <ShoppingCart size={13} />
                Cart
              </Button>
              <Button
                size="sm"
                className="text-xs bg-[#ff9f00] hover:bg-[#e68f00] text-white border-0"
                onClick={handleBuyNow}
                disabled={addToCart.isPending}
              >
                Buy Now
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" disabled className="w-full text-xs">
              Out of Stock
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
