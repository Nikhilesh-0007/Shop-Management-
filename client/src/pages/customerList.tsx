import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Phone,
  Calendar,
  User,
  Users,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Printer,
  Package,
  Mail,
  ShoppingBag,
  IndianRupee,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BOX_TYPES = ["Top-Bottom", "Magnet", "Ribbon"];
const BOX_PRINT_TYPES = ["Plain", "Printed"];
const ENVELOPE_SIZES = ["Big100", "3 1/2 * 4 1/2", "Small New", "3*4", "Other"];
const ENVELOPE_PRINT_TYPES = ["Plain", "Print"];
const ENVELOPE_PRINT_METHODS = ["Single Color", "Multi Color", "Other"];
const BAG_SIZES = ["9*6*3", "D*C*B", "10*7*4", "10*8*4", "13*9*3", "12*10*4", "14*10*4", "11*16*4", "12*16*4", "16*12*4", "13*17*5", "Other"];
const BAG_PRINT_TYPES = ["Plain", "Print"];
const BAG_PRINT_METHODS = ["Single Color", "Multi Color"];
const HANDLE_TYPES = ["Rope", "Ribbon", "None"];
const ROPE_COLORS = ["Gold", "Black", "White", "Other"];
const RIBBON_COLORS = ["Gold", "Black", "White", "Red", "Other"];
const LAMINATION_TYPES = ["Gloss", "Matte"];

type ItemType = "box" | "envelope" | "bag";

interface OrderItem {
  id?: number;
  itemType: ItemType;
  // box
  boxType?: string;
  length?: number;
  breadth?: number;
  height?: number;
  printType?: string;
  color?: string;
  details?: string;
  // envelope
  envelopeSize?: string;
  envelopePrintType?: string;
  envelopePrintMethod?: string;
  envelopeCustomPrint?: string;
  envelopeColor?: string;
  envelopeHeight?: number;
  envelopeWidth?: number;
  // bag
  bagSize?: string;
  bagHeight?: number;
  bagWidth?: number;
  bagGusset?: number;
  doreType?: string;
  handleColor?: string;
  customHandleColor?: string;
  bagPrintType?: string;
  printMethod?: string;
  laminationType?: string;
  // common
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  items?: OrderItem[];
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  orderCount?: number;
  totalSpent?: number;
  orders?: Order[];
}

export default function CustomerList() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [printingOrderId, setPrintingOrderId] = useState<number | null>(null);

  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [deleteOrderLoading, setDeleteOrderLoading] = useState(false);

  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editOrderItems, setEditOrderItems] = useState<OrderItem[]>([]);
  const [editOrderLoading, setEditOrderLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      const list: Customer[] = data.customers || [];
      setCustomers(list);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId: number) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/orders`);
      if (!res.ok) return;
      const data = await res.json();
      const orders: Order[] = data.orders || [];
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId
            ? {
                ...c,
                orders,
                orderCount: orders.length,
                totalSpent: orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
              }
            : c
        )
      );
    } catch {}
  };

  const handlePrintOrder = async (orderId: number) => {
    setPrintingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/print`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) w.onload = () => setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 500);
    } catch (err: any) {
      toast({ title: "Print Error", description: err.message, variant: "destructive" });
    } finally {
      setPrintingOrderId(null);
    }
  };

  const openEditOrder = async (order: Order) => {
    if (order.items) {
      setEditOrder(order);
      setEditOrderItems(order.items);
      return;
    }
    try {
      const res = await fetch(`/api/orders/${order.id}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      const data = await res.json();
      const rawItems = data.items || data.order?.items || [];
      const items: OrderItem[] = rawItems.map((it: any) => {
        let parsed: any = {};
        try { parsed = typeof it.itemData === 'string' ? JSON.parse(it.itemData) : (it.itemData || {}); } catch {}
        return {
          ...parsed,
          itemType: it.itemType || it.item_type || parsed.itemType || "box",
          quantity: it.quantity ?? parsed.quantity ?? 1,
          price: it.price ?? parsed.price ?? 0,
        };
      });
      setEditOrder({ ...order, items });
      setEditOrderItems(items);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    setEditOrderItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const addEditItem = (type: ItemType) => {
    const base = { itemType: type, quantity: 1, price: 0 };
    if (type === "box") setEditOrderItems((p) => [...p, { ...base, boxType: "", length: 1, breadth: 1, height: 1, printType: "", color: "", details: "" }]);
    else if (type === "envelope") setEditOrderItems((p) => [...p, { ...base, envelopeSize: "", envelopePrintType: "", envelopePrintMethod: "", envelopeCustomPrint: "", envelopeHeight: 1, envelopeWidth: 1 }]);
    else setEditOrderItems((p) => [...p, { ...base, bagSize: "", bagHeight: 1, bagWidth: 1, bagGusset: 1, doreType: "", handleColor: "", customHandleColor: "", bagPrintType: "", printMethod: "", laminationType: "" }]);
  };

  const removeEditItem = (index: number) => {
    setEditOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveOrder = async () => {
    if (!editOrder) return;
    setEditOrderLoading(true);
    try {
      const res = await fetch(`/api/orders/${editOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: editOrderItems, orderDate: editOrder.orderDate }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      const totalAmount = editOrderItems.reduce((s, it) => s + it.price * it.quantity, 0);
      setCustomers((prev) =>
        prev.map((c) => ({
          ...c,
          orders: c.orders?.map((o) =>
            o.id === editOrder.id ? { ...o, items: editOrderItems, totalAmount } : o
          ),
        }))
      );
      toast({ title: "Order updated successfully" });
      setEditOrder(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEditOrderLoading(false);
    }
  };

  const handleExpand = (customer: Customer) => {
    if (expandedId === customer.id) {
      setExpandedId(null);
    } else {
      setExpandedId(customer.id);
      if (!customer.orders) fetchCustomerOrders(customer.id);
    }
  };

  const openEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setEditName(customer.name);
    setEditPhone(customer.phone);
  };

  const handleEdit = async () => {
    if (!editCustomer) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/customers/${editCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });
      if (!res.ok) throw new Error("Failed to update customer");
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editCustomer.id ? { ...c, name: editName, phone: editPhone } : c
        )
      );
      toast({ title: "Customer updated successfully" });
      setEditCustomer(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    setDeleteOrderLoading(true);
    try {
      const res = await fetch(`/api/orders/${deleteOrderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete order");
      setCustomers((prev) => prev.map((c) => ({
        ...c,
        orders: c.orders?.filter((o) => o.id !== deleteOrderId),
        orderCount: c.orders ? c.orders.filter((o) => o.id !== deleteOrderId).length : c.orderCount,
      })));
      toast({ title: "Order deleted successfully" });
      setDeleteOrderId(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteOrderLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-sm text-gray-500">Manage and view all customers</p>
          </div>
        </div>
      </div>



      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p>Loading customers...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No customers found</p>
          <p className="text-sm">{searchTerm ? "Try a different search." : "No customers yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((customer) => (
            <Card key={customer.id} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                      <p className="text-xs text-gray-400">ID #{customer.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(customer)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:bg-gray-100" onClick={() => handleExpand(customer)}>
                      {expandedId === customer.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{customer.phone}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(customer.createdAt).toLocaleDateString()}</span>
                  {customer.orderCount !== undefined && (
                    <span className="flex items-center gap-1 text-blue-600 font-medium"><Package className="h-3.5 w-3.5" />{customer.orderCount} orders</span>
                  )}
                  {customer.totalSpent !== undefined && (
                    <span className="flex items-center gap-1 text-green-600 font-medium"><IndianRupee className="h-3.5 w-3.5" />{(Number(customer.totalSpent) || 0).toFixed(2)} spent</span>
                  )}
                </div>

                {expandedId === customer.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-3">Order History</p>
                    {!customer.orders ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        Loading orders...
                      </div>
                    ) : customer.orders.length === 0 ? (
                      <p className="text-sm text-gray-400">No orders found.</p>
                    ) : (
                      <div className="space-y-2">
                        {customer.orders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            <div>
                              <p className="text-sm font-medium text-gray-800">Order #{order.id}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(order.orderDate).toLocaleDateString()} · ₹{(Number(order.totalAmount) || 0).toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs border-gray-200 text-gray-600 hover:bg-gray-50"
                                onClick={() => openEditOrder(order)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                                disabled={printingOrderId === order.id}
                                onClick={() => handlePrintOrder(order.id)}>
                                <Printer className="h-3 w-3 mr-1" />
                                {printingOrderId === order.id ? "Printing..." : "Print"}
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteOrderId(order.id)}>
                                <Trash2 className="h-3 w-3 mr-1" />Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Order Dialog */}
      <Dialog open={!!editOrder} onOpenChange={() => setEditOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order #{editOrder?.id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => addEditItem("box")}><Package className="h-3.5 w-3.5 mr-1" />Box</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addEditItem("envelope")}><Mail className="h-3.5 w-3.5 mr-1" />Envelope</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => addEditItem("bag")}><ShoppingBag className="h-3.5 w-3.5 mr-1" />Bag</Button>
            </div>
            {editOrderItems.map((item, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-sm capitalize">{item.itemType} #{index + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeEditItem(index)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {item.itemType === "box" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Box Type</Label>
                          <Select value={item.boxType || ""} onValueChange={(v) => updateItem(index, "boxType", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{BOX_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Length</Label>
                          <Input className="h-8 text-sm" type="number" min="0.1" step="0.1" value={item.length ?? 1} onChange={(e) => updateItem(index, "length", parseFloat(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Breadth</Label>
                          <Input className="h-8 text-sm" type="number" min="0.1" step="0.1" value={item.breadth ?? 1} onChange={(e) => updateItem(index, "breadth", parseFloat(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Height</Label>
                          <Input className="h-8 text-sm" type="number" min="0.1" step="0.1" value={item.height ?? 1} onChange={(e) => updateItem(index, "height", parseFloat(e.target.value) || 1)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Print Type</Label>
                          <Select value={item.printType || ""} onValueChange={(v) => updateItem(index, "printType", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{BOX_PRINT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {item.printType === "Plain" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Color</Label>
                            <Input className="h-8 text-sm" value={item.color || ""} onChange={(e) => updateItem(index, "color", e.target.value)} />
                          </div>
                        )}
                        {item.printType === "Printed" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Details</Label>
                            <Input className="h-8 text-sm" value={item.details || ""} onChange={(e) => updateItem(index, "details", e.target.value)} />
                          </div>
                        )}
                      </>
                    )}
                    {item.itemType === "envelope" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Size</Label>
                          <Select value={item.envelopeSize || ""} onValueChange={(v) => updateItem(index, "envelopeSize", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{ENVELOPE_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {item.envelopeSize === "Other" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Height</Label>
                              <Input className="h-8 text-sm" type="number" value={item.envelopeHeight ?? 1} onChange={(e) => updateItem(index, "envelopeHeight", parseFloat(e.target.value) || 1)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Width</Label>
                              <Input className="h-8 text-sm" type="number" value={item.envelopeWidth ?? 1} onChange={(e) => updateItem(index, "envelopeWidth", parseFloat(e.target.value) || 1)} />
                            </div>
                          </>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">Print Type</Label>
                          <Select value={item.envelopePrintType || ""} onValueChange={(v) => updateItem(index, "envelopePrintType", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{ENVELOPE_PRINT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {item.envelopePrintType === "Plain" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Color</Label>
                            <Input className="h-8 text-sm" value={item.envelopeColor || ""} onChange={(e) => updateItem(index, "envelopeColor", e.target.value)} />
                          </div>
                        )}
                        {item.envelopePrintType === "Print" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Print Method</Label>
                            <Select value={item.envelopePrintMethod || ""} onValueChange={(v) => updateItem(index, "envelopePrintMethod", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{ENVELOPE_PRINT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        {item.envelopePrintType === "Print" && item.envelopePrintMethod === "Other" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Custom Print</Label>
                            <Input className="h-8 text-sm" value={item.envelopeCustomPrint || ""} onChange={(e) => updateItem(index, "envelopeCustomPrint", e.target.value)} />
                          </div>
                        )}
                      </>
                    )}
                    {item.itemType === "bag" && (
                      <>
                        <div className="space-y-1">
                          <Label className="text-xs">Bag Size</Label>
                          <Select value={item.bagSize || ""} onValueChange={(v) => updateItem(index, "bagSize", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{BAG_SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {item.bagSize === "Other" && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">Height</Label>
                              <Input className="h-8 text-sm" type="number" value={item.bagHeight ?? 1} onChange={(e) => updateItem(index, "bagHeight", parseFloat(e.target.value) || 1)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Width</Label>
                              <Input className="h-8 text-sm" type="number" value={item.bagWidth ?? 1} onChange={(e) => updateItem(index, "bagWidth", parseFloat(e.target.value) || 1)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Gusset</Label>
                              <Input className="h-8 text-sm" type="number" value={item.bagGusset ?? 1} onChange={(e) => updateItem(index, "bagGusset", parseFloat(e.target.value) || 1)} />
                            </div>
                          </>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">Handle (Dori)</Label>
                          <Select value={item.doreType || ""} onValueChange={(v) => updateItem(index, "doreType", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{HANDLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {item.doreType === "Rope" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Handle Color</Label>
                            <Select value={item.handleColor || ""} onValueChange={(v) => updateItem(index, "handleColor", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{ROPE_COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        {item.doreType === "Ribbon" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Handle Color</Label>
                            <Select value={item.handleColor || ""} onValueChange={(v) => updateItem(index, "handleColor", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{RIBBON_COLORS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        {(item.doreType === "Rope" || item.doreType === "Ribbon") && item.handleColor === "Other" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Custom Color</Label>
                            <Input className="h-8 text-sm" value={item.customHandleColor || ""} onChange={(e) => updateItem(index, "customHandleColor", e.target.value)} />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs">Print Type</Label>
                          <Select value={item.bagPrintType || ""} onValueChange={(v) => updateItem(index, "bagPrintType", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{BAG_PRINT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        {item.bagPrintType === "Print" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Print Method</Label>
                            <Select value={item.printMethod || ""} onValueChange={(v) => updateItem(index, "printMethod", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{BAG_PRINT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                        {item.bagPrintType === "Print" && item.printMethod === "Single Color" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Print Technique</Label>
                            <Input className="h-8 text-sm bg-gray-100" value="Screen Printing" readOnly />
                          </div>
                        )}
                        {item.bagPrintType === "Print" && item.printMethod === "Multi Color" && (
                          <div className="space-y-1">
                            <Label className="text-xs">Lamination</Label>
                            <Select value={item.laminationType || ""} onValueChange={(v) => updateItem(index, "laminationType", v)}>
                              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>{LAMINATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input className="h-8 text-sm" type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price</Label>
                      <Input className="h-8 text-sm" type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(index, "price", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOrder(null)}>Cancel</Button>
            <Button onClick={handleSaveOrder} disabled={editOrderLoading || editOrderItems.length === 0}>
              {editOrderLoading ? "Saving..." : "Save Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone number" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditCustomer(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={editLoading || !editName || !editPhone}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Order Confirm */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={() => setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete Order #{deleteOrderId}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} disabled={deleteOrderLoading} className="bg-red-600 hover:bg-red-700">
              {deleteOrderLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
