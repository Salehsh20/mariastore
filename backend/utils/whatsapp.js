/**
 * Generate a WhatsApp checkout link with cart items
 */
function generateWhatsAppLink(cartItems, totalPrice) {
    const phoneNumber = process.env.WHATSAPP_NUMBER || '966XXXXXXXXX';
    const storeName = process.env.STORE_NAME || 'MariaStore';
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    let message = `Hello ${storeName}! I'd like to order:\n\n`;

    cartItems.forEach((item, index) => {
        message += `${index + 1}. *${item.name}*\n`;
        if (item.color) message += `   Color: ${item.color}\n`;
        if (item.size) message += `   Size: ${item.size}\n`;
        message += `   Quantity: ${item.quantity}\n`;
        message += `   Price: $${(item.price * item.quantity).toFixed(2)}\n`;
        if (item.slug) message += `   Link: ${baseUrl}/product.html?slug=${item.slug}\n`;
        message += `\n`;
    });

    message += `*Total: $${totalPrice.toFixed(2)}*\n\nPlease confirm availability. Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

module.exports = { generateWhatsAppLink };
