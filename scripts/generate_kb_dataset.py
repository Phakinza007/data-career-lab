"""สร้างชุดข้อมูลฐานความรู้ร้านค้า (public/data/kb_docs.csv, kb_questions.csv) สำหรับสาย AI Engineer

ข้อความเป็นภาษาอังกฤษเพราะ TF-IDF/tokenizer ของ scikit-learn แยกคำด้วยช่องว่าง (ภาษาไทยต้องใช้ตัวตัดคำก่อน)
เขียนด้วยมือ ไม่มีการสุ่ม รันซ้ำแล้วได้ไฟล์เดิมทุกครั้ง: python3 scripts/generate_kb_dataset.py
"""
import csv
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'data'

DOCS = [
    ('d01', 'Standard shipping', 'shipping', 'Standard shipping within Thailand takes 2 to 4 business days after the order is packed. Orders placed before 14:00 are packed the same day. Shipping is free for orders above 1,000 baht; otherwise the fee is 50 baht. Remote provinces may need one extra day.'),
    ('d02', 'Express shipping', 'shipping', 'Express delivery arrives the next business day in Bangkok and Chon Buri, and within two business days in other major cities. Express costs 120 baht per order and is not available for cash on delivery orders or for bulky items such as furniture.'),
    ('d03', 'Tracking your parcel', 'shipping', 'After dispatch you receive an email and SMS with a tracking number. Open the carrier link to see where the parcel is. Tracking updates may take up to 12 hours to appear. If the status has not changed for 3 days, contact support with your order number.'),
    ('d04', 'International shipping', 'shipping', 'We currently ship only within Thailand. International addresses, freight forwarders and PO boxes are not supported. Customers living abroad can use a Thai delivery address of a friend or relative.'),
    ('d05', 'Return policy', 'returns', 'Items can be returned within 14 days of delivery if they are unused and in the original packaging. Start the return in your account under My Orders and print the return label. Beauty products that have been opened cannot be returned for hygiene reasons.'),
    ('d06', 'Refund timing', 'returns', 'Refunds are issued to the original payment method after the returned item passes inspection. Credit card refunds take 5 to 10 business days to appear. PromptPay and bank transfer refunds arrive within 3 business days. Cash on delivery orders are refunded by bank transfer, so we ask for your bank account details.'),
    ('d07', 'Exchanges', 'returns', 'You can exchange clothing and shoes for another size or colour within 14 days if stock is available. Exchanges for a different product are handled as a return followed by a new order. The exchange shipping fee is free once per order.'),
    ('d08', 'Damaged or wrong item', 'returns', 'If your parcel arrives damaged or you received the wrong item, send a photo within 48 hours of delivery. We will ship a replacement at no cost or refund the full price including shipping. Keep the outer box until the case is closed.'),
    ('d09', 'Payment methods', 'payment', 'We accept credit cards, PromptPay QR, bank transfer and cash on delivery. Cash on delivery is available for orders up to 5,000 baht. Payment by bank transfer must be completed within 24 hours or the order is cancelled automatically.'),
    ('d10', 'Installment plans', 'payment', 'Credit card installments of 3, 6 or 10 months at zero percent interest are offered on orders above 3,000 baht from participating banks. The installment option appears at checkout after you enter the card number. Installments are not available for cash on delivery or PromptPay.'),
    ('d11', 'Failed payment', 'payment', 'If your payment fails, check the card limit and that online payments are enabled with your bank. You can retry from My Orders within 24 hours. Repeated failures may be caused by a mismatch between the billing address and the card statement.'),
    ('d12', 'Cancel an order', 'orders', 'An order can be cancelled for free until it is packed, which is usually within a few hours of placing it. After packing, refuse the parcel or start a return. Cancelled prepaid orders are refunded to the original payment method.'),
    ('d13', 'Change address', 'orders', 'You can change the delivery address in My Orders before the parcel is dispatched. After dispatch, contact the carrier with the tracking number to redirect the parcel. We cannot change the address once the parcel is out for delivery.'),
    ('d14', 'Promo codes', 'promo', 'Enter a promo code at checkout in the discount field. Only one code can be used per order, and codes cannot be combined with flash sale prices. Promo codes usually expire at midnight on the end date shown in the email.'),
    ('d15', 'Flash sales', 'promo', 'Flash sales run on the 1st and 15th of each month at 12:00 for 24 hours. Flash sale items have limited stock and cannot be returned for a change of mind, only for defects. Prices are shown on the product page with a countdown timer.'),
    ('d16', 'Referral program', 'promo', 'Invite friends with your referral link. When a friend places a first order above 500 baht, both of you receive a 100 baht voucher valid for 60 days. Vouchers cannot be exchanged for cash and are limited to five per customer.'),
    ('d17', 'Loyalty points', 'account', 'You earn 1 point for every 25 baht spent on completed orders. 100 points can be redeemed for a 40 baht discount. Points expire after 12 months of account inactivity. Points are removed when an order is returned.'),
    ('d18', 'Reset password', 'account', 'Choose Forgot password on the login page and enter your email. A reset link is sent immediately and stays valid for 30 minutes. If you do not see the email, check the spam folder or request a new link.'),
    ('d19', 'Delete account', 'account', 'You can delete your account under Settings, Privacy. Deleting removes your profile, addresses and saved cards. Order records are kept for seven years for tax purposes but are no longer linked to your name.'),
    ('d20', 'Privacy and data', 'privacy', 'We collect your name, address, phone number and order history to deliver orders and improve the service. We never sell personal data. Marketing emails can be turned off at any time from the unsubscribe link or Settings, Notifications.'),
    ('d21', 'Warranty for electronics', 'warranty', 'Electronics carry a one year manufacturer warranty from the delivery date. Keep the invoice as proof of purchase. Warranty covers defects in materials and workmanship, but not water damage, drops or unauthorized repairs.'),
    ('d22', 'Product sizing', 'products', 'Clothing sizes follow Asian sizing, which runs about one size smaller than European sizing. Each product page has a size chart in centimetres. If you are between two sizes we recommend choosing the larger one.'),
    ('d23', 'Stock and pre-orders', 'products', 'When an item is out of stock you can press Notify me and receive an email once it returns. Pre-orders are charged at checkout and shipped within 30 days of the date shown on the product page.'),
    ('d24', 'Contact support', 'support', 'Support is available every day from 9:00 to 21:00 through chat and email. Include your order number for a faster reply. Phone support is not available. Average first response time is under 30 minutes in chat and 6 hours by email.'),
]

QUESTIONS = [
    ('q01', 'How long does standard delivery take?', 'd01'),
    ('q02', 'Is shipping free?', 'd01'),
    ('q03', 'Can I get my order the next day?', 'd02'),
    ('q04', 'Where is my package right now?', 'd03'),
    ('q05', 'Do you deliver to Singapore?', 'd04'),
    ('q06', 'How many days do I have to send an item back?', 'd05'),
    ('q07', 'Can I return a lipstick I already opened?', 'd05'),
    ('q08', 'When will the money for my return arrive on my credit card?', 'd06'),
    ('q09', 'I paid cash on delivery, how do I get my refund?', 'd06'),
    ('q10', 'Can I swap my shirt for a bigger size?', 'd07'),
    ('q11', 'My parcel arrived broken, what should I do?', 'd08'),
    ('q12', 'Which ways of paying do you accept?', 'd09'),
    ('q13', 'Is there a limit for cash on delivery?', 'd09'),
    ('q14', 'Can I pay in monthly installments?', 'd10'),
    ('q15', 'My card was declined at checkout', 'd11'),
    ('q16', 'How do I cancel the order I just placed?', 'd12'),
    ('q17', 'I typed the wrong address, can I fix it?', 'd13'),
    ('q18', 'Can I use two discount codes together?', 'd14'),
    ('q19', 'When do flash sales start?', 'd15'),
    ('q20', 'How do I get a voucher for inviting a friend?', 'd16'),
    ('q21', 'How many points do I earn per purchase?', 'd17'),
    ('q22', 'I forgot my password', 'd18'),
    ('q23', 'How can I close my account?', 'd19'),
    ('q24', 'Do you sell my personal information?', 'd20'),
    ('q25', 'How long is the warranty on a laptop?', 'd21'),
    ('q26', 'Which size should I pick if I am between two sizes?', 'd22'),
    ('q27', 'The item is sold out, can I be told when it is back?', 'd23'),
    ('q28', 'What are your customer service hours?', 'd24'),
    ('q29', 'Can I return a flash sale item because I changed my mind?', 'd15'),
    ('q30', 'Will I lose my loyalty points if I return something?', 'd17'),
]


def write(name, header, rows):
    with open(OUT / name, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)


if __name__ == '__main__':
    write('kb_docs.csv', ['doc_id', 'title', 'category', 'text'], DOCS)
    write('kb_questions.csv', ['question_id', 'question', 'gold_doc_id'], QUESTIONS)
    print(f'kb_docs.csv: {len(DOCS)} แถว, kb_questions.csv: {len(QUESTIONS)} แถว')
