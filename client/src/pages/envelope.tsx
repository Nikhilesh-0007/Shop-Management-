import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Mail, CheckCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createOrderSchema, type CreateOrderInput, type CreateOrderResponse } from "@shared/schema";

const envelopeSizes = ["Big100", "3 1/2 * 4 1/2", "Small New", "3*4", "Other"];
const envelopePrintTypes = ["Plain", "Print"];
const printMethods = ["Multi Color", "Screen Printing", "Other"];

export default function EnvelopeOrders() {
  const { toast } = useToast();
  const [successData, setSuccessData] = useState<CreateOrderResponse | null>(null);

  const form = useForm<CreateOrderInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      orderDate: new Date().toISOString().split("T")[0],
      items: [{ itemType: "envelope", envelopeSize: "", envelopePrintType: "", envelopePrintMethod: "", envelopeCustomPrint: "", envelopeHeight: 1, envelopeWidth: 1, quantity: 1, price: 0 }],
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
        title: "Envelope Order Created Successfully",
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
        items: [{ itemType: "envelope", envelopeSize: "", envelopePrintType: "", envelopePrintMethod: "", envelopeCustomPrint: "", envelopeHeight: 1, envelopeWidth: 1, quantity: 1, price: 0 }],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating Envelope Order",
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
              <span className="text-green-800">Envelope Order #{successData.orderId} created successfully!</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Create Envelope Order
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
              <CardTitle>Envelope Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="items.0.envelopeSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {envelopeSizes.map((size) => (
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
              {form.watch("items.0.envelopeSize") === "Other" && (
                <>
                  <FormField
                    control={form.control}
                    name="items.0.envelopeHeight"
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
                    name="items.0.envelopeWidth"
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
                </>
              )}
              <FormField
                control={form.control}
                name="items.0.envelopePrintType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Print Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select print" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {envelopePrintTypes.map((type) => (
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
              {form.watch("items.0.envelopePrintType") === "Plain" && (
                <FormField
                  control={form.control}
                  name="items.0.envelopeColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter color" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch("items.0.envelopePrintType") === "Print" && (
                <FormField
                  control={form.control}
                  name="items.0.envelopePrintMethod"
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
              {form.watch("items.0.envelopePrintType") === "Print" && form.watch("items.0.envelopePrintMethod") === "Other" && (
                <FormField
                  control={form.control}
                  name="items.0.envelopeCustomPrint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Print Method</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter custom print method" {...field} value={field.value || ""} />
                      </FormControl>
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
                  Create Envelope Order
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}