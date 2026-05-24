import { useLocation } from "wouter";
import { useGetWishlist, useRemoveFromWishlist, useAddToCart, getGetWishlistQueryKey, getGetCartQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { StarRating } from "@/components/StarRating";

export function Wishlist() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useGetWishlist();
  const remove = useRemoveFromWishlist();
  const addToCart = useAddToCart();

  function handleRemove(productId: number) {
    remove.mutate(
      { productId },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetWishlistQueryKey() }) }
    );
  }

  function handleAddToCart(productId: number, title: string) {
    addToCart.mutate(
      { data: { productId, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({ title: "Added to cart", description: title });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!wishlist?.length) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Heart size={64} className="mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
        <p className="text-muted-foreground mb-6">Save products you love to buy them later</p>
        <Button onClick={() => setLocation("/shop")}>Explore Products</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Wishlist ({wishlist.length} items)</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {wishlist.map(item => (
          <div key={item.id} className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all group">
            <div
              className="aspect-[4/5] bg-muted cursor-pointer relative flex items-center justify-center overflow-hidden"
              onClick={() => setLocation(`/products/${item.productId}`)}
            >
              {item.productImage ? (
                <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-primary/10 flex items-center justify-center text-primary/30 text-5xl font-bold uppercase">
                  {item.productTitle?.[0]}
                </div>
              )}
              {!item.inStock && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Badge variant="destructive" className="text-sm">Out of Stock</Badge>
                </div>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleRemove(item.productId); }}
                className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur rounded-full text-red-400 hover:text-red-600 hover:bg-white transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="p-3">
              <h3
                className="text-sm font-semibold line-clamp-2 mb-1 cursor-pointer hover:text-primary"
                onClick={() => setLocation(`/products/${item.productId}`)}
              >
                {item.productTitle}
              </h3>
              <div className="flex items-center gap-1 mb-2">
                <StarRating rating={item.avgRating} size={12} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-sm">₹{item.finalPrice.toLocaleString("en-IN")}</span>
                {item.discountPercent > 0 && (
                  <>
                    <span className="text-xs text-muted-foreground line-through">₹{item.productPrice.toLocaleString("en-IN")}</span>
                    <Badge variant="destructive" className="text-xs py-0">{item.discountPercent}% OFF</Badge>
                  </>
                )}
              </div>
              <Button
                className="w-full gap-2"
                size="sm"
                disabled={!item.inStock || addToCart.isPending}
                onClick={() => handleAddToCart(item.productId, item.productTitle)}
              >
                <ShoppingCart size={14} />
                {item.inStock ? "Add to Cart" : "Out of Stock"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
