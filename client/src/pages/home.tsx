import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Package, Mail, ShoppingBag, Plus, Trash2, Printer, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { createOrderSchema, type CreateOrderInput, type CreateOrderResponse, ItemType } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const BOX_TYPES = ["Top-Bottom", "Magnet", "Ribbon"];
const BOX_PRINT_TYPES = ["Plain", "Printed"];
const ENVELOPE_SIZES = ["Big100", "3 1/2 * 4 1/2", "Small New", "3*4", "Other"];
const ENVELOPE_PRINT_TYPES = ["Plain", "Print"];
const ENVELOPE_PRINT_METHODS = ["Single Color", "Multi Color", "Other"];
const DEFAULT_BAG_SIZES = ["9*6*3", "D*C*B", "10*7*4", "10*8*4", "13*9*3", "12*10*4", "14*10*4", "11*16*4", "12*16*4", "16*12*4", "13*17*5", "Other"];
const BAG_PRINT_TYPES = ["Plain", "Print"];
const BAG_PRINT_METHODS = ["Single Color", "Multi Color"];
const HANDLE_TYPES = ["Rope", "Ribbon", "None"];
const ROPE_COLORS = ["Gold", "Black", "White", "Other"];
const RIBBON_COLORS = ["Gold", "Black", "White", "Red", "Other"];
const LAMINATION_TYPES = ["Gloss", "Matte"];

export default function Home() {
  const { toast } = useToast();
  const [successData, setSuccessData] = useState<CreateOrderResponse | null>(null);
  const [bagSizes, setBagSizes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('customBagSizes');
      if (saved) {
        const custom = JSON.parse(saved) as string[];
        const merged = [...DEFAULT_BAG_SIZES.filter(s => s !== "Other"), ...custom.filter(s => !DEFAULT_BAG_SIZES.includes(s)), "Other"];
        return merged;
      }
    } catch {}
    return DEFAULT_BAG_SIZES;
  });
  const [customSizeDialog, setCustomSizeDialog] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [pendingBagSizeIndex, setPendingBagSizeIndex] = useState<number | null>(null);

  const addCustomBagSize = (newSize: string, itemIndex: number | null) => {
    if (!newSize.trim()) return;
    setBagSizes((prev) => {
      if (prev.includes(newSize)) return prev;
      const updated = [...prev.filter(s => s !== "Other"), newSize, "Other"];
      localStorage.setItem('customBagSizes', JSON.stringify(updated.filter(s => !DEFAULT_BAG_SIZES.includes(s))));
      return updated;
    });
    if (itemIndex !== null) form.setValue(`items.${itemIndex}.bagSize`, newSize);
    setCustomSizeDialog(false);
  };

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      orderDate: new Date().toISOString().split("T")[0],
      items: [{ itemType: "box", boxType: "", length: undefined, breadth: undefined, height: undefined, printType: "", color: "", details: "", quantity: undefined, price: undefined }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleSubmit = async (data: CreateOrderInput) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      toast({ title: "Order Created Successfully", description: "Opening PDF for print." });

      const w = window.open(url, "_blank");
      if (w) w.onload = () => setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 500);

      form.reset();
    } catch (error: any) {
      toast({ title: "Error Creating Order", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const [isLoading, setIsLoading] = useState(false);

  const addItem = (type: "box" | "envelope" | "bag") => {
    if (type === "box") {
      append({ itemType: "box", boxType: "", length: undefined, breadth: undefined, height: undefined, printType: "", color: "", details: "", quantity: undefined, price: undefined });
    } else if (type === "envelope") {
      append({ itemType: "envelope", envelopeSize: "", envelopePrintType: "", envelopeColor: "", envelopePrintMethod: "", envelopeCustomPrint: "", envelopeHeight: undefined, envelopeWidth: undefined, quantity: undefined, price: undefined });
    } else {
      append({ itemType: "bag", bagSize: "", bagHeight: undefined, bagWidth: undefined, bagGusset: undefined, doreType: "", handleColor: "", customHandleColor: "", bagPrintType: "", printMethod: "", laminationType: "", quantity: undefined, price: undefined });
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "box": return <Package className="h-4 w-4" />;
      case "envelope": return <Mail className="h-4 w-4" />;
      case "bag": return <ShoppingBag className="h-4 w-4" />;
      default: return null;
    }
  };

  const getItemLabel = (type: string) => {
    switch (type) {
      case "box": return "Box";
      case "envelope": return "Envelope";
      case "bag": return "Bag";
      default: return "Item";
    }
  };

  return (
    <div className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Order Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">Order Items</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => addItem("box")}>
                  <Package className="mr-1 h-4 w-4" />
                  Box
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem("envelope")}>
                  <Mail className="mr-1 h-4 w-4" />
                  Envelope
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => addItem("bag")}>
                  <ShoppingBag className="mr-1 h-4 w-4" />
                  Bag
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <div className="rounded-md border border-dashed p-8 text-center">
                  <p className="text-muted-foreground">
                    No items added. Click the buttons above to add items.
                  </p>
                </div>
              )}
              {fields.map((field, index) => (
                <Card key={field.id} className="border-muted">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      {getItemIcon(field.itemType)}
                      <span className="font-medium">
                        {getItemLabel(field.itemType)} #{index + 1}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {field.itemType === "box" && (
                      <>
                        <FormField
                          control={form.control}
                          name={`items.${index}.boxType`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Box Type</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BOX_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.length`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Length (in)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  {...f}
                                  value={f.value ?? ''}
                                  onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.breadth`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Breadth (in)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  {...f}
                                  value={f.value ?? ''}
                                  onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.height`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Height (in)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  {...f}
                                  value={f.value ?? ''}
                                  onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.printType`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select print" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BOX_PRINT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`items.${index}.printType`) === "Plain" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.color`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Color</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter color"
                                    {...f}
                                    value={f.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {form.watch(`items.${index}.printType`) === "Printed" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.details`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Details</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter details"
                                    {...f}
                                    value={f.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </>
                    )}

                    {field.itemType === "envelope" && (
                      <>
                        <FormField
                          control={form.control}
                          name={`items.${index}.envelopeSize`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Size</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ENVELOPE_SIZES.map((size) => (
                                    <SelectItem key={size} value={size}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`items.${index}.envelopeSize`) === "Other" && (
                          <>
                            <FormField
                              control={form.control}
                              name={`items.${index}.envelopeHeight`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel>Height (in)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      {...f}
                                      value={f.value ?? ''}
                                      onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.envelopeWidth`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel>Width (in)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      {...f}
                                      value={f.value ?? ''}
                                      onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                        <FormField
                          control={form.control}
                          name={`items.${index}.envelopePrintType`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Type</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select print" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ENVELOPE_PRINT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`items.${index}.envelopePrintType`) === "Plain" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.envelopeColor`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Color</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter color" {...f} value={f.value || ""} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {form.watch(`items.${index}.envelopePrintType`) === "Print" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.envelopePrintMethod`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Print Method</FormLabel>
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ENVELOPE_PRINT_METHODS.map((method) => (
                                      <SelectItem key={method} value={method}>
                                        {method}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {form.watch(`items.${index}.envelopePrintType`) === "Print" && form.watch(`items.${index}.envelopePrintMethod`) === "Other" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.envelopeCustomPrint`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Custom Print Method</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter custom print method"
                                    {...f}
                                    value={f.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </>
                    )}

                    {field.itemType === "bag" && (
                      <>
                        <FormField
                          control={form.control}
                          name={`items.${index}.bagSize`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Bag Size</FormLabel>
                              <Select
                                value={f.value}
                                onValueChange={(v) => {
                                  if (v === "__custom__") {
                                    setPendingBagSizeIndex(index);
                                    setCustomSizeInput("");
                                    setCustomSizeDialog(true);
                                  } else {
                                    f.onChange(v);
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select size" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {bagSizes.filter(s => s !== "Other").map((size) => (
                                    <SelectItem key={size} value={size}>{size}</SelectItem>
                                  ))}
                                  <SelectItem value="__custom__">+ Add Custom Size</SelectItem>
                                  <SelectItem value="Other">Other (enter dimensions)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`items.${index}.bagSize`) === "Other" && (
                          <>
                            <FormField
                              control={form.control}
                              name={`items.${index}.bagHeight`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel>Height (in)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      {...f}
                                      value={f.value ?? ''}
                                      onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.bagWidth`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel>Width (in)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      {...f}
                                      value={f.value ?? ''}
                                      onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.bagGusset`}
                              render={({ field: f }) => (
                                <FormItem>
                                  <FormLabel>Gusset (in)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      {...f}
                                      value={f.value ?? ''}
                                      onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                        <FormField
                          control={form.control}
                          name={`items.${index}.doreType`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Handle (Dori) Specification</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select handle" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {HANDLE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`items.${index}.doreType`) === "Ribbon" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.handleColor`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Handle Color</FormLabel>
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select color" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {RIBBON_COLORS.map((color) => (
                                      <SelectItem key={color} value={color}>
                                        {color}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {form.watch(`items.${index}.doreType`) === "Rope" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.handleColor`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Handle Color</FormLabel>
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select color" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ROPE_COLORS.map((color) => (
                                      <SelectItem key={color} value={color}>
                                        {color}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {(form.watch(`items.${index}.doreType`) === "Ribbon" || form.watch(`items.${index}.doreType`) === "Rope") && form.watch(`items.${index}.handleColor`) === "Other" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.customHandleColor`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Custom Handle Color</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter custom color"
                                    {...f}
                                    value={f.value || ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={form.control}
                          name={`items.${index}.bagPrintType`}
                          render={({ field: f }) => (
                            <FormItem>
                              <FormLabel>Printing Type</FormLabel>
                              <Select onValueChange={f.onChange} value={f.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select print" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {BAG_PRINT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {form.watch(`items.${index}.bagPrintType`) === "Print" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.printMethod`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Print Method</FormLabel>
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {BAG_PRINT_METHODS.map((method) => (
                                      <SelectItem key={method} value={method}>
                                        {method}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        {form.watch(`items.${index}.bagPrintType`) === "Print" && form.watch(`items.${index}.printMethod`) === "Single Color" && (
                          <FormItem>
                            <FormLabel>Print Technique</FormLabel>
                            <FormControl>
                              <Input
                                value="Screen Printing"
                                readOnly
                                className="bg-gray-100"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                        {form.watch(`items.${index}.bagPrintType`) === "Print" && form.watch(`items.${index}.printMethod`) === "Multi Color" && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.laminationType`}
                            render={({ field: f }) => (
                              <FormItem>
                                <FormLabel>Lamination</FormLabel>
                                <Select onValueChange={f.onChange} value={f.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select lamination" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {LAMINATION_TYPES.map((type) => (
                                      <SelectItem key={type} value={type}>
                                        {type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </>
                    )}

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...f}
                              value={f.value ?? ''}
                              onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.price`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...f}
                              value={f.value ?? ''}
                              onChange={(e) => f.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setSuccessData(null);
              }}
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Create Order & Print
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Custom Bag Size Dialog */}
      <Dialog open={customSizeDialog} onOpenChange={setCustomSizeDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Add Custom Bag Size</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. 15*12*5"
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomBagSize(customSizeInput.trim(), pendingBagSizeIndex); } }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomSizeDialog(false)}>Cancel</Button>
            <Button onClick={() => addCustomBagSize(customSizeInput.trim(), pendingBagSizeIndex)}>Add Size</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}