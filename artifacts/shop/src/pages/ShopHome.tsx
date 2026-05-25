import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetFeaturedProducts, useGetFlashSaleProducts, useListCategories } from "@workspace/api-client-react";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function CountdownBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center bg-black/30 rounded-lg px-3 py-2 min-w-[52px] backdrop-blur-sm border border-white/20">
      <span className="text-2xl md:text-3xl font-mono font-black leading-none tabular-nums">
        {pad(value)}
      </span>
      <span className="text-[10px] uppercase tracking-widest mt-1 opacity-75">{label}</span>
    </div>
  );
}

export function ShopHome() {
  const { data: categories, isLoading: isLoadingCategories } = useListCategories();
  const { data: featured, isLoading: isLoadingFeatured } = useGetFeaturedProducts();
  const { data: flashSale, isLoading: isLoadingFlash } = useGetFlashSaleProducts();

  const countdown = useCountdown(flashSale?.endsAt);

  const flashProducts = flashSale?.products ?? [];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (flashProducts.length < 2) return;
    const id = setInterval(() => {
      setActiveIdx((i) => (i + 1) % flashProducts.length);
    }, 4000);
    return () => clearInterval(id);
  }, [flashProducts.length]);

  const activeProduct = flashProducts[activeIdx];

  function prev() {
    setActiveIdx((i) => (i - 1 + flashProducts.length) % flashProducts.length);
  }
  function next() {
    setActiveIdx((i) => (i + 1) % flashProducts.length);
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero / Flash Sale Banner */}
      <section className="bg-gradient-to-r from-primary to-[#ff9b44] text-white overflow-hidden relative">
        <div className="container mx-auto px-4 py-10 md:py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Left: copy + countdown */}
          <div className="space-y-6 max-w-lg z-10">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Biggest Deals<br />of the Season
            </h1>
            <p className="text-lg opacity-90">
              Up to 80% off on top brands. Free shipping above ₹499.
            </p>

            {/* Countdown */}
            {!isLoadingFlash && flashSale && !countdown.expired && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-semibold text-yellow-200">
                  <Zap size={18} className="fill-yellow-200 text-yellow-200" />
                  <span>Flash sale ends in</span>
                </div>
                <div className="flex items-center gap-2">
                  <CountdownBlock label="hrs" value={countdown.hours} />
                  <span className="text-2xl font-bold opacity-60 mb-3">:</span>
                  <CountdownBlock label="min" value={countdown.minutes} />
                  <span className="text-2xl font-bold opacity-60 mb-3">:</span>
                  <CountdownBlock label="sec" value={countdown.seconds} />
                </div>
              </div>
            )}

            {!isLoadingFlash && flashSale && countdown.expired && (
              <div className="bg-black/20 rounded-xl px-4 py-3 inline-flex items-center gap-2 text-sm text-yellow-100">
                <Clock size={16} />
                <span>Flash sale has ended — check back soon!</span>
              </div>
            )}

            <Link
              href="/products?flashSale=true"
              className="inline-block bg-white text-primary font-bold px-8 py-3 rounded-xl hover:bg-yellow-50 transition-colors shadow-lg"
            >
              Shop Flash Deals →
            </Link>
          </div>

          {/* Right: cycling product spotlight */}
          {!isLoadingFlash && activeProduct ? (
            <div className="relative w-full md:w-80 flex-shrink-0 z-10">
              <div className="bg-white/15 border border-white/25 rounded-2xl p-5 backdrop-blur-md shadow-xl">
                {/* Product image */}
                <div className="aspect-square bg-white/20 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  {activeProduct.images?.[0] ? (
                    <img
                      src={activeProduct.images[0]}
                      alt={activeProduct.title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-6xl opacity-40">🛒</span>
                  )}
                </div>

                {/* Product info */}
                <Badge className="bg-yellow-400 text-yellow-900 mb-2 font-bold text-xs">
                  {activeProduct.discountPercent}% OFF
                </Badge>
                <p className="font-semibold text-sm leading-snug line-clamp-2 mb-2">
                  {activeProduct.title}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-black">
                    ₹{Math.round(parseFloat(String(activeProduct.finalPrice))).toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm line-through opacity-60">
                    ₹{Math.round(parseFloat(String(activeProduct.price))).toLocaleString("en-IN")}
                  </span>
                </div>
                {activeProduct.avgRating > 0 && (
                  <div className="flex items-center gap-1 text-yellow-200 text-xs">
                    <Star size={11} className="fill-yellow-200" />
                    <span>{activeProduct.avgRating.toFixed(1)}</span>
                    <span className="opacity-60">({activeProduct.reviewCount})</span>
                  </div>
                )}

                {/* Nav arrows */}
                {flashProducts.length > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={prev}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      aria-label="Previous"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {/* Dots */}
                    <div className="flex gap-1.5">
                      {flashProducts.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === activeIdx ? "bg-white w-4" : "bg-white/40"
                          }`}
                          aria-label={`Product ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={next}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      aria-label="Next"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Skeleton while loading */
            !isLoadingFlash ? (
              <div className="hidden md:block w-1/3">
                <div className="aspect-square bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                  <span className="text-8xl font-bold opacity-80">%</span>
                </div>
              </div>
            ) : (
              <div className="hidden md:block w-80">
                <Skeleton className="aspect-square rounded-2xl opacity-30" />
              </div>
            )
          )}
        </div>

        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-black/10 rounded-full blur-2xl pointer-events-none" />
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="text-secondary" />
                <h2 className="text-2xl font-bold text-secondary">Lightning Deals</h2>
              </div>
              {!countdown.expired && (
                <div className="flex items-center gap-2 text-sm font-mono font-semibold text-secondary">
                  <Zap size={14} className="fill-secondary" />
                  <span>
                    {pad(countdown.hours)}:{pad(countdown.minutes)}:{pad(countdown.seconds)}
                  </span>
                </div>
              )}
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
