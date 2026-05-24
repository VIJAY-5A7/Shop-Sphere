import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useListProducts, useListCategories, useAddToCart, useAddToWishlist, getGetCartQueryKey, getGetWishlistQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StarRating } from "@/components/StarRating";

function useSearchParams() {
  const [location] = useLocation();
  const search = typeof window !== "undefined" ? window.location.search : "";
  return new URLSearchParams(search);
}

export function ProductList() {
  const params = useSearchParams();
  const [, setLocation] = useLocation();

  const [category, setCategory] = useState(params.get("category") ?? "");
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [sort, setSort] = useState(params.get("sort") ?? "");
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [inStock, setInStock] = useState(false);
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setCategory(p.get("category") ?? "");
    setSearch(p.get("search") ?? "");
  }, [window.location.search]);

  const queryParams: Record<string, any> = { page, limit: 20 };
  if (category) queryParams.category = category;
  if (search) queryParams.search = search;
  if (sort) queryParams.sort = sort;
  if (minPrice != null) queryParams.minPrice = minPrice;
  if (maxPrice != null) queryParams.maxPrice = maxPrice;
  if (minRating != null) queryParams.minRating = minRating;
  if (inStock) queryParams.inStock = true;

  const { data, isLoading } = useListProducts(queryParams);
  const { data: categories } = useListCategories();

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  function FiltersPanel() {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-sm font-semibold mb-3 block">Category</Label>
          <div className="space-y-2">
            <button
              onClick={() => { setCategory(""); setPage(1); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              All Categories
            </button>
            {categories?.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.slug); setPage(1); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === cat.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {cat.name} <span className="text-xs opacity-70">({cat.productCount})</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">Price Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Min ₹"
              value={minPrice ?? ""}
              onChange={e => setMinPrice(e.target.value ? Number(e.target.value) : undefined)}
              className="text-sm"
            />
            <Input
              type="number"
              placeholder="Max ₹"
              value={maxPrice ?? ""}
              onChange={e => setMaxPrice(e.target.value ? Number(e.target.value) : undefined)}
              className="text-sm"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-semibold mb-3 block">Min Rating</Label>
          <div className="space-y-2">
            {[4, 3, 2, 1].map(r => (
              <button
                key={r}
                onClick={() => { setMinRating(minRating === r ? undefined : r); setPage(1); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${minRating === r ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <StarRating rating={r} size={14} /> <span>& above</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="instock"
            checked={inStock}
            onCheckedChange={v => { setInStock(!!v); setPage(1); }}
          />
          <Label htmlFor="instock" className="text-sm cursor-pointer">In Stock Only</Label>
        </div>

        {(category || minPrice != null || maxPrice != null || minRating != null || inStock) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCategory(""); setMinPrice(undefined); setMaxPrice(undefined);
              setMinRating(undefined); setInStock(false); setPage(1);
            }}
            className="w-full"
          >
            <X size={14} className="mr-2" /> Clear Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {search ? `Results for "${search}"` : category ? categories?.find(c => c.slug === category)?.name ?? "Products" : "All Products"}
          </h1>
          {!isLoading && <p className="text-sm text-muted-foreground">{total} products found</p>}
        </div>
        <div className="flex items-center gap-3">
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal size={16} className="mr-2" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto">
              <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
              <div className="mt-6"><FiltersPanel /></div>
            </SheetContent>
          </Sheet>
          <Select value={sort || "relevance"} onValueChange={v => { setSort(v === "relevance" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44 text-sm">
              <SelectValue placeholder="Sort: Relevance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-card border rounded-xl p-5 sticky top-20">
            <h2 className="font-semibold mb-4">Filters</h2>
            <FiltersPanel />
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/5] w-full rounded-xl" />
                  <Skeleton className="w-2/3 h-4" />
                  <Skeleton className="w-1/3 h-4" />
                </div>
              ))}
            </div>
          ) : data?.products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-xl font-medium">No products found</p>
              <p className="text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {data?.products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <Button
                        key={p}
                        variant={page === p ? "default" : "outline"}
                        size="icon"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
