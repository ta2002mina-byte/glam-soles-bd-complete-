# Glam Soles BD — Phase 2 (Supabase Backend) — সেটআপ গাইড

Phase 1 (ফাউন্ডেশন) এর উপরে এবার Supabase-এর প্রোডাকশন-রেডি ব্যাকএন্ড যোগ হয়েছে:
ডেটাবেজ স্কিমা, Auth ফাউন্ডেশন, RLS, Storage, এবং নিরাপদ অর্ডার-তৈরির লজিক।

## 🔴 SQL রান করার ধাপ (নিজে করতে হবে)

`supabase/migrations/` ফোল্ডারে ৭টা SQL ফাইল আছে। এগুলো **ঠিক এই ক্রমে** Supabase
Dashboard → SQL Editor-এ গিয়ে একটার পর একটা কপি-পেস্ট করে Run করুন:

1. `001_core_enums_profiles_categories.sql` — roles, profiles (auto-created on signup), categories
2. `002_products_variants_inventory.sql` — products, variants, atomic stock functions
3. `003_cart_wishlist_orders_payments.sql` — cart, wishlist, orders, payments, shipping settings
4. `004_reviews_rewards_notifications_returns_cms.sql` — reviews, rewards, notifications, returns, banners
5. `005_row_level_security.sql` — সবচেয়ে গুরুত্বপূর্ণ — RLS পলিসি (এটা ছাড়া ডেটা অনিরাপদ)
6. `006_secure_order_creation.sql` — create_order() ফাংশন (checkout এর মূল লজিক)
7. `007_storage_buckets_policies.sql` — products/banners/categories/reviews বাকেট

প্রতিটা ফাইল আমার নিজের টেস্ট এনভায়রনমেন্টে (লোকাল PostgreSQL 16) রান করে যাচাই করা হয়েছে —
কোনো সিনট্যাক্স এরর নেই, এবং create_order() ফাংশন সফলভাবে টেস্ট করা হয়েছে: স্টক
ভ্যালিডেশন, ডাবল-ক্লিক প্রোটেকশন (idempotency), এবং কুপন ডিসকাউন্ট হিসাব — সবকিছু।

## যা যা পাচ্ছেন

- Roles: customer, staff, manager, admin — RLS দিয়ে সার্ভার-সাইডে এনফোর্সড
- Auto-profile: কেউ সাইন আপ করলেই তার জন্য profiles টেবিলে একটা রো অটো তৈরি হয়
- Products/Variants: color+size ভিত্তিক ইনভেন্টরি, ওভারসেলিং আটকানোর atomic stock function
- নিরাপদ চেকআউট: create_order() — ক্লায়েন্ট থেকে দাম/স্টক/টোটাল কখনো বিশ্বাস করে না,
  সবকিছু সার্ভারে রিক্যালকুলেট করে, ডাবল-ক্লিক/রিট্রাই সেফ (idempotency_key দিয়ে)
- RLS: প্রতিটা টেবিলে — কাস্টমার শুধু নিজের ডেটা দেখে, স্টাফ/ম্যানেজার/অ্যাডমিনের আলাদা অ্যাক্সেস
- Storage: products/banners/categories (স্টাফ-অনলি আপলোড, পাবলিক রিড), reviews (owner আপলোড)
- service-role key কখনো ব্রাউজারে যায় না — .env.local.example-এ শুধু anon key

## Auth সেটআপ (Supabase Dashboard-এ)

1. Authentication → Providers → Email চালু আছে কিনা নিশ্চিত করুন (ডিফল্টে থাকে)
2. Authentication → URL Configuration-এ আপনার সাইট URL (লোকাল/প্রোডাকশন) যোগ করুন
3. চাইলে Phone/OTP পরে অ্যাক্টিভেট করতে পারবেন

## অ্যাডমিন ইউজার বানানো

প্রথম অ্যাডমিন বানাতে সাইন আপ করার পর SQL Editor-এ রান করুন:

```sql
update profiles set role = 'admin' where id = 'তোমার-user-id-এখানে-বসাও';
```

(user id পাবেন Authentication → Users থেকে)

## পরের ধাপ (Phase 3)

Phase 3 = হোমপেজ (hero, category sections, women/men/kids/accessories collections,
best sellers, promotional banners, newsletter, footer) — Supabase-এর real data দিয়ে।
বলুন শুরু করবো কিনা।
