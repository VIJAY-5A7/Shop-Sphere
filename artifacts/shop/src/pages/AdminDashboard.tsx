import { useState } from "react";
import { useGetAdminDashboard, useListUsers, useBanUser, useListAllOrders, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Users, Package, ShoppingBag, Clock, UserCheck, Search, ShieldOff, ShieldCheck } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  shipped: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  return_requested: "bg-orange-50 text-orange-700 border-orange-200",
  returned: "bg-gray-50 text-gray-600 border-gray-200",
};

export function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useGetAdminDashboard();
  const [userSearch, setUserSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");

  const { data: users } = useListUsers(userSearch ? { search: userSearch } : {});
  const { data: ordersData } = useListAllOrders(orderStatus !== "all" ? { status: orderStatus } : {});
  const banUser = useBanUser();

  function handleBanToggle(userId: number, isBanned: boolean) {
    banUser.mutate(
      { userId, data: { banned: !isBanned, reason: !isBanned ? "Violation of terms" : undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: isBanned ? "User unbanned" : "User banned" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const stats = [
    { label: "Revenue", value: `₹${Math.round((dashboard?.totalRevenue ?? 0) / 1000)}k`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Orders", value: dashboard?.totalOrders ?? 0, icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Users", value: dashboard?.totalUsers ?? 0, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Products", value: dashboard?.totalProducts ?? 0, icon: Package, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Pending", value: dashboard?.pendingOrders ?? 0, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "New Today", value: dashboard?.newUsersToday ?? 0, icon: UserCheck, color: "text-teal-600", bg: "bg-teal-50" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-card border rounded-xl p-4">
            <div className={`w-8 h-8 rounded-full ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon size={16} className={s.color} />
            </div>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      {dashboard?.revenueChart && dashboard.revenueChart.length > 0 && (
        <div className="bg-card border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">Platform Revenue (14 Days)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dashboard.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString("en-IN")}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders">All Orders</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="topProducts">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <div className="flex items-center gap-3 mb-4">
            <Select value={orderStatus} onValueChange={v => setOrderStatus(v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "return_requested", "returned"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{ordersData?.total ?? 0} orders</span>
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Total</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {ordersData?.orders.map(order => (
                  <tr key={order.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">#{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.items.length} item(s)</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{new Date(order.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{order.total.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground border"}`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
                {!ordersData?.orders.length && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-center px-4 py-3 font-medium">Role</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className="capitalize text-xs">{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isBanned ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">Banned</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 font-medium">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={u.isBanned ? "text-green-600 hover:text-green-700" : "text-red-500 hover:text-red-600"}
                        onClick={() => handleBanToggle(u.id, u.isBanned ?? false)}
                        disabled={banUser.isPending}
                      >
                        {u.isBanned ? <><ShieldCheck size={14} className="mr-1" /> Unban</> : <><ShieldOff size={14} className="mr-1" /> Ban</>}
                      </Button>
                    </td>
                  </tr>
                ))}
                {!users?.length && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Orders</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.categoryStats.map((c, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-3 font-medium">{c.categoryName}</td>
                    <td className="px-4 py-3 text-right">{c.orders}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{c.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {!dashboard?.categoryStats.length && (
                  <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="topProducts">
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Product</th>
                  <th className="text-right px-4 py-3 font-medium">Units</th>
                  <th className="text-right px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.topProducts.map((p, i) => (
                  <tr key={p.productId} className="border-t">
                    <td className="px-4 py-3 text-muted-foreground font-bold">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 text-right">{p.unitsSold}</td>
                    <td className="px-4 py-3 text-right font-semibold">₹{p.revenue.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {!dashboard?.topProducts.length && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No sales data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
