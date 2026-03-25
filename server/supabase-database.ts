import { createClient } from '@supabase/supabase-js';
import type { Customer, Order, OrderItemRecord, CreateOrderInput } from "../shared/schema";

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nosrrummadjqjbyuonsj.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vc3JydW1tYWRqcWpieXVvbnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MzEwNTQsImV4cCI6MjA5MDAwNzA1NH0.gIKdZod2nZnCmq12t5f7Z_5OxU8xVUH2LxzkmqBmXzo';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface IDatabase {
  createCustomer(name: string, phone: string): Promise<Customer>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  findCustomerByPhone(phone: string): Promise<Customer | undefined>;
  getAllCustomers(): Promise<Customer[]>;
  updateCustomer(id: number, name: string, phone: string): Promise<void>;
  deleteCustomer(id: number): Promise<void>;
  
  createOrder(input: CreateOrderInput): Promise<{ order: Order; customer: Customer }>;
  getOrderById(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<{ order: Order; customer: Customer; items: OrderItemRecord[] } | undefined>;
  getOrdersByCustomerId(id: number): Promise<Order[]>;
  updateOrder(id: number, input: CreateOrderInput): Promise<void>;
  deleteOrder(id: number): Promise<void>;
  getAllOrders(): Promise<Order[]>;
}

class SupabaseDatabase implements IDatabase {
  async createCustomer(name: string, phone: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, phone })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  }

  async findCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      name: data.name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  }

  async createOrder(input: CreateOrderInput): Promise<{ order: Order; customer: Customer }> {
    let customer = await this.findCustomerByPhone(input.phoneNumber);
    if (!customer) {
      customer = await this.createCustomer(input.customerName, input.phoneNumber);
    }

    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        order_date: input.orderDate,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = input.items.map(item => {
      const { itemType, quantity, price, ...itemData } = item;
      return {
        order_id: orderData.id,
        item_type: itemType,
        item_data: JSON.stringify(itemData),
        quantity,
        price,
      };
    });

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    console.log(`[DB] Order #${orderData.id} created for customer ${customer.name}`);

    const order: Order = {
      id: orderData.id,
      customerId: orderData.customer_id,
      orderDate: orderData.order_date,
      totalAmount: orderData.total_amount,
      pdfPath: orderData.pdf_path,
      createdAt: orderData.created_at,
    };

    return { order, customer };
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    return {
      id: data.id,
      customerId: data.customer_id,
      orderDate: data.order_date,
      totalAmount: data.total_amount,
      pdfPath: data.pdf_path,
      createdAt: data.created_at,
    };
  }

  async getOrderWithItems(id: number): Promise<{ order: Order; customer: Customer; items: OrderItemRecord[] } | undefined> {
    const order = await this.getOrderById(id);
    if (!order) return undefined;

    const customer = await this.getCustomerById(order.customerId);
    if (!customer) return undefined;

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (itemsError) throw itemsError;

    const items: OrderItemRecord[] = itemsData.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      itemType: row.item_type,
      itemData: row.item_data,
      quantity: row.quantity,
      price: row.price,
    }));

    return { order, customer, items };
  }

  async updateOrderPdfPath(orderId: number, pdfPath: string): Promise<void> {
    // PDF path no longer stored in database
    console.log(`[DB] Order #${orderId} PDF generated: ${pdfPath}`);
  }

  async deleteOrder(id: number): Promise<void> {
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);
    if (itemsError) throw itemsError;

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getAllOrders(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      orderDate: row.order_date,
      totalAmount: row.total_amount,
      pdfPath: null,
      createdAt: row.created_at,
    }));
  }

  async getAllCustomers(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      createdAt: row.created_at,
    }));
  }

  async updateCustomer(id: number, name: string, phone: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ name, phone })
      .eq('id', id);

    if (error) throw error;
  }

  async deleteCustomer(id: number): Promise<void> {
    // First get all orders for this customer
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', id);

    // Delete order_items for each order
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id);
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (itemsError) throw itemsError;
    }

    // Delete orders
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .eq('customer_id', id);
    if (ordersError) throw ordersError;

    // Delete customer
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async getOrdersByCustomerId(customerId: number): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((row) => ({
      id: row.id,
      customerId: row.customer_id,
      orderDate: row.order_date,
      totalAmount: row.total_amount,
      pdfPath: null,
      createdAt: row.created_at,
    }));
  }

  async updateOrder(id: number, input: CreateOrderInput): Promise<void> {
    const totalAmount = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const { error: orderError } = await supabase
      .from('orders')
      .update({ order_date: input.orderDate, total_amount: totalAmount })
      .eq('id', id);

    if (orderError) throw orderError;

    // Delete existing items and re-insert
    const { error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);

    if (deleteError) throw deleteError;

    const orderItems = input.items.map(item => {
      const { itemType, quantity, price, ...itemData } = item;
      return {
        order_id: id,
        item_type: itemType,
        item_data: JSON.stringify(itemData),
        quantity,
        price,
      };
    });

    const { error: insertError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (insertError) throw insertError;
  }
}

export const database: IDatabase = new SupabaseDatabase();