import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Search, ShoppingCart, Heart, User, Store, Shield, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetCart, useGetMe, useListProducts, getGetCartQueryKey, getGetMeQueryKey, getListProductsQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/useDebounce";

function SearchBox({ className }: { className?: string }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 280);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSuggestions = debouncedQuery.trim().length >= 2;

  const searchParams = { search: debouncedQuery.trim(), limit: 6 };
  const { data, isFetching } = useListProducts(
    searchParams,
    { query: { enabled: showSuggestions, queryKey: getListProductsQueryKey(searchParams) } }
  );

  const suggestions = data?.products ?? [];

  useEffect(() => {
    if (!showSuggestions) { setOpen(false); return; }
    setOpen(true);
  }, [showSuggestions, suggestions.length]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setOpen(false);
      setLocation(`/products?search=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  }

  function handleSelect(slug: string) {
    setOpen(false);
    setQuery("");
    setLocation(`/products/${slug}`);
  }

  function handleSeeAll() {
    setOpen(false);
    setLocation(`/products?search=${encodeURIComponent(debouncedQuery.trim())}`);
    setQuery("");
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search for products, brands and more..."
          className="w-full bg-white text-foreground pl-4 pr-10 rounded-full border-0 focus-visible:ring-2 focus-visible:ring-secondary"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (showSuggestions) setOpen(true); }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-primary"
        >
          {isFetching && showSuggestions
            ? <Loader2 size={16} className="animate-spin" />
            : <Search size={18} />
          }
        </Button>
      </form>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border z-[200] overflow-hidden">
          {/* Suggestions list */}
          {suggestions.length > 0 ? (
            <>
              <ul>
                {suggestions.map((p) => {
                  const price = parseFloat(String(p.finalPrice));
                  const original = parseFloat(String(p.price));
                  const hasDiscount = p.discountPercent > 0;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left group"
                        onPointerDown={(e) => { e.preventDefault(); handleSelect(p.slug); }}
                      >
                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                          {p.images?.[0]
                            ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-contain" />
                            : <span className="text-lg text-muted-foreground">🛒</span>
                          }
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-foreground group-hover:text-primary transition-colors">
                            {p.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{p.categoryName} · {p.brand}</p>
                        </div>
                        {/* Price */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">
                            ₹{Math.round(price).toLocaleString("en-IN")}
                          </p>
                          {hasDiscount && (
                            <p className="text-xs text-muted-foreground line-through">
                              ₹{Math.round(original).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                        {hasDiscount && (
                          <span className="ml-1 shrink-0 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {p.discountPercent}% off
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t px-4 py-2.5">
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); handleSeeAll(); }}
                  className="text-sm text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  <Search size={13} />
                  See all results for &quot;{debouncedQuery.trim()}&quot;
                </button>
              </div>
            </>
          ) : isFetching ? (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin" />
              Searching…
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &ldquo;<strong className="text-foreground">{debouncedQuery.trim()}</strong>&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const { data: cart } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const { data: me } = useGetMe({ query: { enabled: !!user, queryKey: getGetMeQueryKey() } });

  return (
    <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/shop" className="flex items-center gap-2 font-bold text-2xl tracking-tight shrink-0">
          <span className="bg-white text-primary rounded px-2 py-0.5">S</span>
          ShopWave
        </Link>

        {/* Desktop search */}
        <SearchBox className="flex-1 max-w-2xl hidden md:block" />

        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <Link href="/wishlist">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/20 hover:text-white rounded-full">
              <Heart size={20} />
            </Button>
          </Link>

          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative text-primary-foreground hover:bg-primary/20 hover:text-white rounded-full">
              <ShoppingCart size={20} />
              {cart && cart.itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center">
                  {cart.itemCount}
                </span>
              )}
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full overflow-hidden border-2 border-primary-foreground/20 hover:border-white transition-colors">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User size={20} className="text-primary-foreground" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.fullName || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile & Addresses</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/orders")}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span>My Orders</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/wishlist")}>
                <Heart className="mr-2 h-4 w-4" />
                <span>Wishlist</span>
              </DropdownMenuItem>

              {(me?.role === "seller" || me?.role === "admin") && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/seller")}>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Seller Dashboard</span>
                  </DropdownMenuItem>
                </>
              )}

              {me?.role === "admin" && (
                <DropdownMenuItem onClick={() => setLocation("/admin")}>
                  <Shield className="mr-2 h-4 w-4" />
                  <span>Admin Dashboard</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search */}
      <div className="md:hidden px-4 pb-3">
        <SearchBox />
      </div>
    </header>
  );
}
