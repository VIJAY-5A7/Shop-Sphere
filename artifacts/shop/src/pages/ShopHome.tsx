import { Link } from "wouter";
import { useGetFeaturedProducts, useGetFlashSaleProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Zap } from "lucide-react";

export function ShopHome() {
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  const { data: featured, isLoading: isLoadingFeatured } = useGetFeaturedProducts();
  const { data: flashSale, isLoading: isLoadingFlash } = useGetFlashSaleProducts();

  return (
    <div className="min-h-screen pb-20">
      {/* Hero / Flash Sale Banner */}
      <section className="bg-gradient-to-r from-primary to-[#ff9b44] text-white">
        <div className="container mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-6 max-w-xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Biggest Deals of the Season
            </h1>
            <p className="text-lg md:text-xl opacity-90">
              Up to 80% off on top brands. Free shipping on all orders above ₹499.
            </p>
            {flashSale && (
              <div className="bg-black/20 p-4 rounded-xl inline-block backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2 font-medium">
                  <Zap className="text-yellow-300" />
                  <span>Flash Sale Ends In</span>
                </div>
                <div className="text-2xl font-mono font-bold tracking-wider">
                  12 : 45 : 30
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:block w-1/3">
            <div className="aspect-square bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
              <span className="text-8xl font-bold opacity-80">%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Shop by Category</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {isLoadingCategories ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-20 h-20 md:w-32 md:h-32 rounded-full" />
                <Skeleton className="w-16 h-4" />
              </div>
            ))
          ) : (
            categories?.slice(0, 6).map((cat) => (
              <Link key={cat.id} href={`/products?category=${cat.slug}`} className="flex flex-col items-center gap-3 group">
                <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-transparent group-hover:border-primary transition-all shadow-sm">
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  ) : (
                    <span className="text-2xl font-bold text-muted-foreground group-hover:text-primary transition-colors">{cat.name[0]}</span>
                  )}
                </div>
                <span className="font-medium text-sm md:text-base text-center group-hover:text-primary transition-colors">{cat.name}</span>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* Flash Sale Strip */}
      {flashSale?.products && flashSale.products.length > 0 && (
        <section className="py-12 bg-muted/50 border-y">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="text-secondary" />
              <h2 className="text-2xl font-bold text-secondary">Lightning Deals</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {flashSale.products.slice(0, 5).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-12 container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Trending Now</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {isLoadingFeatured ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                <Skeleton className="w-2/3 h-4" />
                <Skeleton className="w-1/3 h-4" />
              </div>
            ))
          ) : (
            featured?.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
