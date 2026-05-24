import { Link } from "wouter";
import { ShoppingCart, Heart } from "lucide-react";
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart.mutate(
      { data: { productId: product.id, quantity: 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
          toast({
            title: "Added to Cart",
            description: `${product.title} has been added to your cart.`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to add to cart. Please try again.",
          });
        }
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
          toast({
            title: "Added to Wishlist",
            description: `${product.title} has been saved to your wishlist.`,
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not add to wishlist.",
          });
        }
      }
    );
  };

  return (
    <Link href={`/products/${product.id}`} className="block group">
      <div className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col relative">
        {product.discountPercent > 0 && (
          <div className="absolute top-2 left-2 z-10 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded-md">
            {product.discountPercent}% OFF
          </div>
        )}
        <button
          onClick={handleAddToWishlist}
          className="absolute top-2 right-2 z-10 p-2 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-primary hover:bg-white transition-colors"
        >
          <Heart size={18} />
        </button>
        
        <div className="aspect-[4/5] bg-muted relative overflow-hidden flex items-center justify-center">
          {product.images?.[0] ? (
            <img 
              src={product.images[0]} 
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-primary/10 flex items-center justify-center text-primary/40 text-6xl font-bold uppercase">
              {product.brand?.[0] || product.title?.[0] || "P"}
            </div>
          )}
        </div>
        
        <div className="p-4 flex flex-col flex-grow">
          <div className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">{product.brand}</div>
          <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">{product.title}</h3>
          
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={product.avgRating} />
            <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
          </div>
          
          <div className="mt-auto flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">₹{product.finalPrice.toLocaleString('en-IN')}</span>
                {product.discountPercent > 0 && (
                  <span className="text-sm text-muted-foreground line-through">₹{product.price.toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
            
            <Button
              size="icon"
              className="rounded-full h-10 w-10 shrink-0 shadow-md"
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
            >
              <ShoppingCart size={18} />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
