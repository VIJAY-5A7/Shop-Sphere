import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/clerk-react";
import { Search, ShoppingCart, Heart, User, Store, Shield, LogOut, Menu } from "lucide-react";
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
import { useGetCart, useGetMe, getGetCartQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";

export function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  
  const { data: cart } = useGetCart({ query: { enabled: !!user, queryKey: getGetCartQueryKey() } });
  const { data: me } = useGetMe({ query: { enabled: !!user, queryKey: getGetMeQueryKey() } });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      setLocation(`/products?search=${encodeURIComponent(search.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/shop" className="flex items-center gap-2 font-bold text-2xl tracking-tight shrink-0">
          <span className="bg-white text-primary rounded px-2 py-0.5">S</span>
          ShopWave
        </Link>
        
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative hidden md:flex">
          <Input
            type="search"
            placeholder="Search for products, brands and more..."
            className="w-full bg-white text-foreground pl-4 pr-10 rounded-full border-0 focus-visible:ring-2 focus-visible:ring-secondary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" size="icon" variant="ghost" className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:bg-transparent hover:text-primary">
            <Search size={18} />
          </Button>
        </form>

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
                  <p className="text-sm font-medium leading-none">{user?.fullName || 'User'}</p>
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
      <div className="md:hidden px-4 pb-3">
        <form onSubmit={handleSearch} className="relative">
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-white text-foreground pl-4 pr-10 rounded-full border-0"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" size="icon" variant="ghost" className="absolute right-0 top-0 h-9 w-9 text-muted-foreground">
            <Search size={16} />
          </Button>
        </form>
      </div>
    </header>
  );
}
