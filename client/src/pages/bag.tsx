import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ShoppingBag, CheckCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createOrderSchema, type CreateOrderInput, type CreateOrderResponse } from "@shared/schema";

const bagSizes = ["9*6*3", "D*C*B", "10*7*4", "10*8*4", "13*9*3", "12*10*4", "14*10*4", "11*16*4", "12*16*4", "16*12*4", "13*17*5", "Other"];
const bagPrintTypes = ["Plain", "Print"];
const printMethods = ["Single Color", "Multi Color"];
const doreTypes = ["Rope", "Ribbon", "None"];
const ropeColors = ["Gold", "Black", "White", "Red", "Other"];
const ribbonColors = ["Gold", "Black", "White", "Other"];
const laminationTypes = ["Gloss", "Matte"];

export default function BagOrders() {
  const { toast } = useToast();
  const [successData, setSuccessData] = useState<CreateOrderResponse | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      orderDate: new Date().toISOString().split("T")[0],
      items: [{ itemType: "bag", bagSize: "", bagHeight: 1, bagWidth: 1, bagGusset: 1, doreType: "", handleColor: "", customHandleColor: "", bagPrintType: "", printMethod: "", laminationType: "", quantity: 1, price: 0 }],
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const response = await apiRequest("POST", "/api/create-order", data);
      return (await response.json()) as CreateOrderResponse;
    },
    onSuccess: (data) => {
      setSuccessData(data);
      toast({
        title: "Bag Order Created Successfully",
        description: `Order #${data.orderId} has been saved and ${data.pdfUrls.length} PDF(s) generated.`,
      });

      data.pdfUrls.forEach((pdfInfo, index) => {
        setTimeout(() => {
          const pdfWindow = window.open(pdfInfo.url, "_blank");
          if (pdfWindow) {
            pdfWindow.onload = () => {
              setTimeout(() => pdfWindow.print(), 500);
            };
          }
        }, index * 1000);
      });

      form.reset({
        customerName: "",
        phoneNumber: "",
        orderDate: new Date().toISOString().split("T")[0],
        items: [{ itemType: "bag", bagSize: "", bagHeight: 1, bagWidth: 1, bagGusset: 1, doreType: "", handleColor: "", customHandleColor: "", bagPrintType: "", printMethod: "", laminationType: "", quantity: 1, price: 0 }],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Bag Order",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateOrderInput) => {
    setSuccessData(null);
    createOrderMutation.mutate(data);
  };

  return (
    <div className="p-6">
      {successData && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800">Bag Order #{successData.orderId} created successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Create Bag Order
              </CardTitle>
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
            <CardHeader>
              <CardTitle>Bag Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="items.0.bagSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bag Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bagSizes.map((size) => (
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
              {form.watch("items.0.bagSize") === "Other" && (
                <>
                  <FormField
                    control={form.control}
                    name="items.0.bagHeight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (in)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="items.0.bagWidth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Width (in)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="items.0.bagGusset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gusset (in)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
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
                name="items.0.doreType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handle (Dori) Specification</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select handle" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doreTypes.map((type) => (
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
              {form.watch("items.0.doreType") === "Ribbon" && (
                <FormField
                  control={form.control}
                  name="items.0.handleColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handle Color</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ribbonColors.map((color) => (
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
              {form.watch("items.0.doreType") === "Rope" && (
                <FormField
                  control={form.control}
                  name="items.0.handleColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Handle Color</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ropeColors.map((color) => (
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
              {(form.watch("items.0.doreType") === "Ribbon" || form.watch("items.0.doreType") === "Rope") && form.watch("items.0.handleColor") === "Other" && (
                <FormField
                  control={form.control}
                  name="items.0.customHandleColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Handle Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter custom color" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="items.0.bagPrintType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Printing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select print" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bagPrintTypes.map((type) => (
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
              {form.watch("items.0.bagPrintType") === "Print" && (
                <FormField
                  control={form.control}
                  name="items.0.printMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Print Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {printMethods.map((method) => (
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
              {form.watch("items.0.bagPrintType") === "Print" && form.watch("items.0.printMethod") === "Single Color" && (
                <FormItem>
                  <FormLabel>Print Technique</FormLabel>
                  <FormControl>
                    <Input value="Screen Printing" readOnly className="bg-gray-100" />
                  </FormControl>
                </FormItem>
              )}
              {form.watch("items.0.bagPrintType") === "Print" && form.watch("items.0.printMethod") === "Multi Color" && (
                <FormField
                  control={form.control}
                  name="items.0.laminationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lamination</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select lamination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {laminationTypes.map((type) => (
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
              <FormField
                control={form.control}
                name="items.0.quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="items.0.price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => {
              form.reset();
              setSuccessData(null);
            }}>
              Reset
            </Button>
            <Button type="submit" disabled={createOrderMutation.isPending}>
              {createOrderMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Create Bag Order
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}