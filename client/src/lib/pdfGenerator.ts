import jsPDF from 'jspdf';
import { CreateOrderInput } from '@shared/schema';

export const generateOrderPDF = (orderData: CreateOrderInput, orderId: number): jsPDF => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ORDER FORM', pageWidth / 2, 25, { align: 'center' });
  
  // Order details
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Order #: ${orderId}`, 20, 45);
  pdf.text(`Date: ${orderData.orderDate}`, 20, 55);
  
  // Customer info
  pdf.setFont('helvetica', 'bold');
  pdf.text('CUSTOMER:', 20, 75);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${orderData.customerName} - ${orderData.phoneNumber}`, 20, 85);
  
  // Items details
  let yPos = 105;
  pdf.setFont('helvetica', 'bold');
  pdf.text('PRODUCTION SPECIFICATIONS', 20, yPos);
  yPos += 15;
  
  orderData.items.forEach((item, index) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`ITEM ${index + 1}: ${item.itemType.toUpperCase()}`, 20, yPos);
    yPos += 10;
    
    pdf.setFont('helvetica', 'normal');
    
    if (item.itemType === 'box') {
      pdf.text(`• Box Type: ${item.boxType}`, 25, yPos); yPos += 7;
      pdf.text(`• Dimensions: ${item.length} x ${item.breadth} x ${item.height} cm`, 25, yPos); yPos += 7;
      pdf.text(`• Print Type: ${item.printType}`, 25, yPos); yPos += 7;
      if (item.printType === 'Plain' && item.color) {
        pdf.text(`• Color: ${item.color}`, 25, yPos); yPos += 7;
      }
      if (item.printType === 'Printed' && item.details) {
        pdf.text(`• Print Details: ${item.details}`, 25, yPos); yPos += 7;
      }
    }
    
    if (item.itemType === 'envelope') {
      pdf.text(`• Size: ${item.envelopeSize}`, 25, yPos); yPos += 7;
      if (item.envelopeSize === 'Other' && item.envelopeHeight && item.envelopeWidth) {
        pdf.text(`• Custom Dimensions: ${item.envelopeHeight} x ${item.envelopeWidth} cm`, 25, yPos); yPos += 7;
      }
      pdf.text(`• Print Type: ${item.envelopePrintType}`, 25, yPos); yPos += 7;
      if (item.envelopePrintType === 'Print' && item.envelopePrintMethod) {
        pdf.text(`• Print Method: ${item.envelopePrintMethod}`, 25, yPos); yPos += 7;
        if (item.envelopePrintMethod === 'Other' && item.envelopeCustomPrint) {
          pdf.text(`• Custom Print: ${item.envelopeCustomPrint}`, 25, yPos); yPos += 7;
        }
      }
    }
    
    if (item.itemType === 'bag') {
      pdf.text(`• Bag Size: ${item.bagSize}`, 25, yPos); yPos += 7;
      if (item.bagSize === 'Other' && item.bagHeight && item.bagWidth) {
        pdf.text(`• Custom Dimensions: ${item.bagHeight} x ${item.bagWidth}`, 25, yPos);
        if (item.bagGusset) pdf.text(` x ${item.bagGusset} cm`, 25, yPos);
        yPos += 7;
      }
      pdf.text(`• Handle Type: ${item.doreType}`, 25, yPos); yPos += 7;
      if ((item.doreType === 'Ribbon' || item.doreType === 'Rope') && item.handleColor) {
        pdf.text(`• Handle Color: ${item.handleColor}`, 25, yPos); yPos += 7;
        if (item.handleColor === 'Other' && item.customHandleColor) {
          pdf.text(`• Custom Handle Color: ${item.customHandleColor}`, 25, yPos); yPos += 7;
        }
      }
      pdf.text(`• Print Type: ${item.bagPrintType}`, 25, yPos); yPos += 7;
      if (item.bagPrintType === 'Print' && item.printMethod) {
        pdf.text(`• Print Method: ${item.printMethod}`, 25, yPos); yPos += 7;
        if (item.printMethod === 'Multi Color' && item.laminationType) {
          pdf.text(`• Lamination: ${item.laminationType}`, 25, yPos); yPos += 7;
        }
      }
    }
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`• Quantity: ${item.quantity}`, 25, yPos); yPos += 7;
    pdf.text(`• Unit Price: ₹${item.price.toFixed(2)}`, 25, yPos); yPos += 15;
  });
  
  // Total
  const grandTotal = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(`TOTAL ORDER VALUE: ₹${grandTotal.toFixed(2)}`, 20, yPos);
  
  // Footer
  // pdf.setFontSize(10);
  // pdf.setFont('helvetica', 'normal');
  // pdf.text('Production Department - Internal Use Only', pageWidth / 2, pageHeight - 20, { align: 'center' });
  
  return pdf;
};

export const printOrderPDF = (orderData: CreateOrderInput, orderId: number) => {
  const pdf = generateOrderPDF(orderData, orderId);
  
  // Open PDF in new window and trigger print
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  
  const printWindow = window.open(pdfUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
  
  return pdfBlob;
};