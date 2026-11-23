--
-- PostgreSQL database dump
--

\restrict hCxPVS6rUQVDwztJRcsmIryall8bp4kNUtG5fkBqk7xqODkruj5e2cTV3ewMWxA

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: business_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_type (business_type_id, type_name, description) FROM stdin;
1	Bakery	Home bakeries and bakery businesses
2	Clothing	Clothing stores and apparel sellers
3	Restaurant	Restaurants, cafes and food outlets
4	Flower Shop	Florists and bouquet businesses
5	Retail	General retail businesses
6	Boutique	Boutiques using clothing/product-variant functionality
\.


--
-- Data for Name: business; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business (business_id, business_type_id, business_name, currency_code, created_at) FROM stdin;
1	1	Sweet Crumbs	INR	2026-11-13 14:40:47.165385+05:30
2	2	Style House	INR	2026-11-13 14:40:47.165385+05:30
3	3	Coastal Bites	INR	2026-11-13 18:18:39.300462+05:30
4	4	Petal & Bloom	INR	2026-11-13 20:23:41.101741+05:30
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product (product_id, business_id, product_name, category, description, unit_price, cost_price, is_active) FROM stdin;
1	1	Chocolate Cake	Cakes	Chocolate truffle cake	650.00	380.00	t
2	1	Brownie Box	Desserts	Box of six brownies	250.00	120.00	t
3	1	Vanilla Cupcake	Cupcakes	Vanilla buttercream cupcake	80.00	35.00	t
4	1	Red Velvet Cake	Cakes	Classic red velvet cake	750.00	420.00	t
5	2	Cotton T-Shirt	Tops	Casual cotton T-shirt	599.00	250.00	t
6	2	Denim Jeans	Bottoms	Regular fit denim jeans	1299.00	650.00	t
7	2	Summer Dress	Dresses	Floral summer dress	1499.00	700.00	t
8	2	Casual Shirt	Shirts	Casual cotton shirt	899.00	400.00	t
9	3	Masala Dosa	Breakfast	Crispy dosa with potato filling	90.00	35.00	t
10	3	Paneer Butter Masala	Main Course	Paneer in creamy tomato gravy	220.00	110.00	t
11	3	Veg Fried Rice	Main Course	Vegetable fried rice	150.00	65.00	t
12	3	Mangalore Buns	Snacks	Traditional sweet fried buns	60.00	20.00	t
13	3	Filter Coffee	Beverages	South Indian filter coffee	35.00	12.00	t
14	4	Red Roses	Flowers	Fresh red roses	25.00	12.00	t
15	4	White Lilies	Flowers	Fresh white lilies	80.00	45.00	t
16	4	Pink Tulips	Flowers	Fresh pink tulips	60.00	30.00	t
17	4	Baby Breath	Filler Flowers	White baby breath stems	20.00	8.00	t
18	4	Eucalyptus	Foliage	Fresh eucalyptus stems	30.00	15.00	t
19	4	Classic Rose Bouquet	Bouquets	Red roses with baby breath and eucalyptus	650.00	250.00	t
20	4	Lily Elegance Bouquet	Bouquets	White lilies with baby breath and eucalyptus	850.00	380.00	t
21	4	Pastel Tulip Bouquet	Bouquets	Pink tulips with baby breath and eucalyptus	750.00	320.00	t
\.


--
-- Data for Name: bakery_product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bakery_product (business_id, product_id, flavour, shelf_life_days) FROM stdin;
1	1	Chocolate	3
1	2	Chocolate	5
1	3	Vanilla	2
1	4	Red Velvet	3
\.


--
-- Data for Name: bouquet_assembly; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bouquet_assembly (assembly_id, business_id, bouquet_product_id, quantity_assembled, assembly_date) FROM stdin;
1	4	19	2	2026-11-13 20:48:42.277553+05:30
2	4	19	1	2026-11-13 20:52:46.104187+05:30
\.


--
-- Data for Name: flower_product; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flower_product (business_id, product_id, flower_type, color) FROM stdin;
4	14	Rose	Red
4	15	Lily	White
4	16	Tulip	Pink
4	17	Filler	Cream
4	18	Foliage	Green
\.


--
-- Data for Name: bouquet_component; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bouquet_component (bouquet_product_id, flower_product_id, quantity) FROM stdin;
19	14	12.000
19	17	5.000
19	18	3.000
20	15	6.000
20	17	4.000
20	18	4.000
21	16	10.000
21	17	5.000
21	18	3.000
\.


--
-- Data for Name: module; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.module (module_id, module_name, module_key, description) FROM stdin;
1	Inventory	inventory	Products and stock levels
2	Orders	orders	Order creation and tracking
3	Customers	customers	Customer records and history
4	Employees	employees	Employee records
5	Expenses	expenses	Business expense tracking
6	Suppliers	suppliers	Supplier records and product sourcing
7	Recipes	recipes	Recipes and ingredients
8	Production Batches	batches	Production and expiry tracking
9	Product Variants	product_variants	Size, colour and SKU variations
10	Reservations	reservations	Table reservations
11	Dining Tables	dining_tables	Restaurant table management
12	Bouquets	bouquets	Bouquet composition
\.


--
-- Data for Name: business_module; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_module (business_id, module_id, enabled, activated_at) FROM stdin;
1	1	t	2026-11-13 14:41:06.594007+05:30
1	2	t	2026-11-13 14:41:06.594007+05:30
1	3	t	2026-11-13 14:41:06.594007+05:30
1	4	t	2026-11-13 14:41:06.594007+05:30
1	5	t	2026-11-13 14:41:06.594007+05:30
1	6	t	2026-11-13 14:41:06.594007+05:30
1	7	t	2026-11-13 14:41:06.594007+05:30
1	8	t	2026-11-13 14:41:06.594007+05:30
2	1	t	2026-11-13 14:41:06.594007+05:30
2	2	t	2026-11-13 14:41:06.594007+05:30
2	3	t	2026-11-13 14:41:06.594007+05:30
2	4	t	2026-11-13 14:41:06.594007+05:30
2	5	t	2026-11-13 14:41:06.594007+05:30
2	6	t	2026-11-13 14:41:06.594007+05:30
2	9	t	2026-11-13 14:41:06.594007+05:30
3	1	t	2026-11-13 18:18:55.173858+05:30
3	2	t	2026-11-13 18:18:55.173858+05:30
3	3	t	2026-11-13 18:18:55.173858+05:30
3	4	t	2026-11-13 18:18:55.173858+05:30
3	5	t	2026-11-13 18:18:55.173858+05:30
3	6	t	2026-11-13 18:18:55.173858+05:30
3	10	t	2026-11-13 18:18:55.173858+05:30
3	11	t	2026-11-13 18:18:55.173858+05:30
4	1	t	2026-11-13 20:24:13.5339+05:30
4	2	t	2026-11-13 20:24:13.5339+05:30
4	3	t	2026-11-13 20:24:13.5339+05:30
4	4	t	2026-11-13 20:24:13.5339+05:30
4	5	t	2026-11-13 20:24:13.5339+05:30
4	6	t	2026-11-13 20:24:13.5339+05:30
4	12	t	2026-11-13 20:24:13.5339+05:30
\.


--
-- Data for Name: business_type_module; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_type_module (business_type_id, module_id, default_enabled) FROM stdin;
1	1	t
1	2	t
1	3	t
1	4	t
1	5	t
1	6	t
1	7	t
1	8	t
2	1	t
2	2	t
2	3	t
2	4	t
2	5	t
2	6	t
2	9	t
3	1	t
3	2	t
3	3	t
3	4	t
3	5	t
3	6	t
3	10	t
3	11	t
4	1	t
4	2	t
4	3	t
4	4	t
4	5	t
4	6	t
4	12	t
5	1	t
5	2	t
5	3	t
5	4	t
5	5	t
5	6	t
6	1	t
6	2	t
6	3	t
6	4	t
6	5	t
6	6	t
6	9	t
\.


--
-- Data for Name: customer; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer (customer_id, business_id, customer_name, phone, email, address, registered_at) FROM stdin;
1	1	Ananya Rao	9876500001	ananya@example.com	\N	2026-11-13 15:07:11.236334+05:30
2	1	Rohan Shetty	9876500002	rohan@example.com	\N	2026-11-13 15:07:11.236334+05:30
3	1	Megha Nair	9876500003	megha@example.com	\N	2026-11-13 15:07:11.236334+05:30
4	1	Kavya Sharma	9876500004	kavya@example.com	\N	2026-11-13 15:07:11.236334+05:30
5	2	Diya Menon	9876500005	diya@example.com	\N	2026-11-13 15:07:11.236334+05:30
6	2	Arjun Kumar	9876500006	arjun@example.com	\N	2026-11-13 15:07:11.236334+05:30
7	2	Sneha Pai	9876500007	sneha@example.com	\N	2026-11-13 15:07:11.236334+05:30
8	2	Rahul Verma	9876500008	rahul@example.com	\N	2026-11-13 15:07:11.236334+05:30
9	3	Aarav Shetty	9876501001	aarav@example.com	\N	2026-11-13 18:20:54.550988+05:30
10	3	Ishita Rao	9876501002	ishita@example.com	\N	2026-11-13 18:20:54.550988+05:30
11	3	Vihaan Nair	9876501003	vihaan@example.com	\N	2026-11-13 18:20:54.550988+05:30
12	3	Anika Pai	9876501004	anika@example.com	\N	2026-11-13 18:20:54.550988+05:30
13	4	Saanvi Rao	9876502001	saanvi@example.com	\N	2026-11-13 21:01:04.253333+05:30
14	4	Aditya Shetty	9876502002	aditya@example.com	\N	2026-11-13 21:01:04.253333+05:30
15	4	Mira Nair	9876502003	mira@example.com	\N	2026-11-13 21:01:04.253333+05:30
16	4	Ishaan Pai	9876502004	ishaan@example.com	\N	2026-11-13 21:01:04.253333+05:30
\.


--
-- Data for Name: dining_table; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.dining_table (dining_table_id, business_id, table_number, capacity, table_status) FROM stdin;
1	3	T1	2	available
2	3	T2	2	available
3	3	T3	4	available
4	3	T4	4	available
5	3	T5	6	available
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role (role_id, role_name) FROM stdin;
1	Owner
2	Manager
3	Employee
5	Sales Staff
6	Inventory Manager
7	Production Staff
8	Delivery Staff
\.


--
-- Data for Name: employee; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employee (employee_id, business_id, role_id, full_name, phone, email, address, hire_date, salary) FROM stdin;
17	1	1	Priya Rao	9876510001	priya@example.com	\N	2025-01-10	30000.00
18	1	2	Kiran Shetty	9876510002	kiran@example.com	\N	2025-03-15	22000.00
19	1	5	Nisha Kumar	9876510003	nisha@example.com	\N	2025-05-01	18000.00
20	1	6	Aman Das	9876510004	aman@example.com	\N	2025-07-20	15000.00
21	2	1	Rahul Menon	9876520001	rahul.m@example.com	\N	2025-02-01	32000.00
22	2	2	Sneha Pai	9876520002	sneha.p@example.com	\N	2025-04-10	24000.00
23	2	3	Arjun Rao	9876520003	arjun.r@example.com	\N	2025-06-15	18000.00
24	2	5	Diya Nair	9876520004	diya.n@example.com	\N	2025-08-01	20000.00
\.


--
-- Data for Name: expense_category; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense_category (expense_category_id, business_id, category_name) FROM stdin;
1	1	Raw Materials
2	1	Packaging
3	1	Electricity
4	1	Rent
5	1	Delivery
6	2	Stock Purchases
7	2	Rent
8	2	Electricity
9	2	Marketing
10	2	Transportation
\.


--
-- Data for Name: expense; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expense (expense_id, business_id, expense_category_id, amount, expense_date, payment_method, description) FROM stdin;
1	1	1	4500.00	2026-10-03	UPI	Flour, sugar and dairy supplies
2	1	2	1200.00	2026-10-06	Cash	Cake boxes and packaging
3	1	3	1800.00	2026-10-10	UPI	October electricity bill
4	1	4	8000.00	2026-10-01	Bank Transfer	October shop rent
5	1	5	900.00	2026-10-15	UPI	Delivery expenses
6	1	1	5200.00	2026-11-02	UPI	November raw materials
7	1	2	1500.00	2026-11-05	Cash	November packaging supplies
8	1	3	1900.00	2026-11-10	UPI	November electricity bill
9	2	6	12000.00	2026-10-04	Bank Transfer	New clothing stock
10	2	7	10000.00	2026-10-01	Bank Transfer	October shop rent
11	2	8	2200.00	2026-10-12	UPI	October electricity bill
12	2	9	3000.00	2026-10-18	UPI	Social media promotion
13	2	10	800.00	2026-10-20	Cash	Stock transportation
14	2	6	15000.00	2026-11-03	Bank Transfer	November clothing stock
15	2	7	10000.00	2026-11-01	Bank Transfer	November shop rent
16	2	8	2300.00	2026-11-12	UPI	November electricity bill
\.


--
-- Data for Name: ingredient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ingredient (ingredient_id, business_id, ingredient_name, unit) FROM stdin;
1	1	Flour	kg
2	1	Sugar	kg
3	1	Butter	kg
4	1	Cocoa Powder	kg
5	1	Milk	litre
6	1	Eggs	pieces
7	1	Vanilla Extract	ml
8	1	Cream Cheese	kg
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory (inventory_id, business_id, product_id, quantity, reorder_level, updated_at) FROM stdin;
1	1	1	5.000	5.000	2026-11-13 15:04:50.867173+05:30
2	1	2	40.000	10.000	2026-11-13 15:04:50.867173+05:30
3	1	3	8.000	10.000	2026-11-13 15:04:50.867173+05:30
4	1	4	3.000	5.000	2026-11-13 15:04:50.867173+05:30
5	2	5	35.000	10.000	2026-11-13 15:04:50.867173+05:30
6	2	6	4.000	5.000	2026-11-13 15:04:50.867173+05:30
7	2	7	18.000	10.000	2026-11-13 15:04:50.867173+05:30
8	2	8	25.000	10.000	2026-11-13 15:04:50.867173+05:30
9	3	9	30.000	5.000	2026-11-13 18:19:55.734584+05:30
10	3	10	15.000	5.000	2026-11-13 18:19:55.734584+05:30
11	3	11	20.000	5.000	2026-11-13 18:19:55.734584+05:30
12	3	12	25.000	5.000	2026-11-13 18:19:55.734584+05:30
13	3	13	40.000	5.000	2026-11-13 18:19:55.734584+05:30
20	4	20	0.000	2.000	2026-11-13 20:51:57.37562+05:30
21	4	21	0.000	2.000	2026-11-13 20:51:57.37562+05:30
17	4	17	65.000	20.000	2026-11-13 20:52:46.104187+05:30
18	4	18	41.000	15.000	2026-11-13 20:52:46.104187+05:30
14	4	14	59.000	20.000	2026-11-13 21:04:33.207148+05:30
19	4	19	0.000	2.000	2026-11-13 21:04:33.207148+05:30
15	4	15	37.000	10.000	2026-11-13 21:04:50.583367+05:30
16	4	16	56.000	15.000	2026-11-13 21:04:50.583367+05:30
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (order_id, business_id, customer_id, employee_id, order_date, order_status, payment_method, payment_status, delivery_date, delivery_status) FROM stdin;
2	1	1	18	2026-10-05 00:00:00+05:30	completed	\N	pending	\N	\N
3	1	2	19	2026-10-12 00:00:00+05:30	completed	\N	pending	\N	\N
4	1	3	18	2026-11-02 00:00:00+05:30	completed	\N	pending	\N	\N
5	1	4	19	2026-11-08 00:00:00+05:30	placed	\N	pending	\N	\N
6	2	5	22	2026-10-08 00:00:00+05:30	completed	\N	pending	\N	\N
7	2	6	23	2026-10-19 00:00:00+05:30	completed	\N	pending	\N	\N
8	2	7	22	2026-11-04 00:00:00+05:30	completed	\N	pending	\N	\N
9	2	8	23	2026-11-10 00:00:00+05:30	placed	\N	pending	\N	\N
10	3	9	\N	2026-11-12 00:00:00+05:30	completed	\N	pending	\N	\N
11	3	10	\N	2026-11-13 00:00:00+05:30	completed	\N	pending	\N	\N
12	3	11	\N	2026-11-13 00:00:00+05:30	placed	\N	pending	\N	\N
13	4	13	\N	2026-11-12 00:00:00+05:30	completed	\N	pending	\N	\N
14	4	14	\N	2026-11-13 00:00:00+05:30	completed	\N	pending	\N	\N
15	4	15	\N	2026-11-13 00:00:00+05:30	placed	\N	pending	\N	\N
\.


--
-- Data for Name: product_variant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variant (variant_id, business_id, product_id, sku, size_label, color, material, additional_price, variant_quantity) FROM stdin;
1	2	5	TS-BLK-S	S	Black	Cotton	0.00	8.000
3	2	5	TS-BLK-L	L	Black	Cotton	0.00	6.000
4	2	5	TS-WHT-M	M	White	Cotton	0.00	7.000
5	2	5	TS-BLU-L	L	Blue	Cotton	50.00	4.000
6	2	6	DJ-BLU-28	28	Blue	Denim	0.00	5.000
7	2	6	DJ-BLU-30	30	Blue	Denim	0.00	8.000
8	2	6	DJ-BLU-32	32	Blue	Denim	0.00	6.000
9	2	6	DJ-BLU-34	34	Blue	Denim	100.00	3.000
10	2	7	SD-FLR-S	S	Floral	Rayon	0.00	4.000
11	2	7	SD-FLR-M	M	Floral	Rayon	0.00	6.000
12	2	7	SD-FLR-L	L	Floral	Rayon	0.00	5.000
13	2	8	CS-WHT-M	M	White	Cotton	0.00	7.000
14	2	8	CS-WHT-L	L	White	Cotton	0.00	5.000
15	2	8	CS-BLU-M	M	Blue	Cotton	50.00	4.000
2	2	5	TS-BLK-M	M	Black	Cotton	0.00	7.000
\.


--
-- Data for Name: order_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_details (order_detail_id, business_id, order_id, product_id, quantity_ordered, unit_price, variant_id) FROM stdin;
19	1	2	1	2.000	150.00	\N
20	1	2	2	1.000	200.00	\N
21	1	3	3	3.000	120.00	\N
22	1	4	1	1.000	150.00	\N
23	1	5	4	2.000	180.00	\N
24	2	6	5	1.000	1200.00	\N
25	2	7	6	2.000	800.00	\N
26	2	8	7	1.000	1500.00	\N
27	2	9	5	3.000	1200.00	2
28	3	10	9	2.000	90.00	\N
29	3	12	9	1.000	90.00	\N
30	3	11	10	2.000	220.00	\N
31	3	11	11	2.000	150.00	\N
32	3	10	12	1.000	60.00	\N
33	3	12	12	3.000	60.00	\N
34	3	10	13	2.000	35.00	\N
35	3	11	13	2.000	35.00	\N
36	3	12	13	1.000	35.00	\N
37	4	13	14	5.000	25.00	\N
38	4	14	15	3.000	80.00	\N
39	4	14	16	4.000	60.00	\N
40	4	15	17	2.000	20.00	\N
41	4	13	19	1.000	650.00	\N
42	4	15	19	1.000	650.00	\N
\.


--
-- Data for Name: order_fulfillment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_fulfillment (fulfillment_id, business_id, order_id, fulfilled_at) FROM stdin;
1	4	13	2026-11-13 21:04:33.207148+05:30
2	4	14	2026-11-13 21:04:50.583367+05:30
\.


--
-- Data for Name: supplier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.supplier (supplier_id, business_id, supplier_name, phone, email, address) FROM stdin;
1	1	Fresh Farms Dairy	9876501001	freshfarms@example.com	Mangalore
2	1	Bake Essentials	9876501002	bakeessentials@example.com	Udupi
3	1	Sweet Packaging Co	9876501003	sweetpackaging@example.com	Bangalore
4	2	Urban Fabrics	9876502001	urbanfabrics@example.com	Bangalore
5	2	Denim Distributors	9876502002	denimdist@example.com	Mangalore
6	2	Style Accessories	9876502003	styleaccessories@example.com	Udupi
\.


--
-- Data for Name: product_supplier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_supplier (business_id, product_id, supplier_id, supplier_price) FROM stdin;
1	1	2	300.00
1	2	2	100.00
1	3	1	25.00
1	4	2	350.00
1	1	1	320.00
1	3	3	30.00
2	5	4	240.00
2	6	5	620.00
2	7	4	680.00
2	8	4	380.00
2	5	6	260.00
2	8	6	390.00
\.


--
-- Data for Name: production_batch; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.production_batch (batch_id, business_id, product_id, batch_code, production_date, expiry_date, quantity_produced) FROM stdin;
1	1	1	CC-001	2026-11-10	2026-11-13	10.000
2	1	1	CC-002	2026-11-12	2026-11-15	8.000
3	1	2	BB-001	2026-11-09	2026-11-14	20.000
4	1	3	VC-001	2026-11-12	2026-11-14	24.000
5	1	3	VC-002	2026-11-13	2026-11-15	18.000
6	1	4	RV-001	2026-11-11	2026-11-14	6.000
\.


--
-- Data for Name: recipe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe (recipe_id, business_id, product_id, recipe_name, instructions) FROM stdin;
1	1	1	Chocolate Cake Recipe	Prepare chocolate sponge, bake, cool and layer with chocolate cream.
2	1	2	Brownie Recipe	Mix chocolate batter, bake, cool and cut into brownie portions.
3	1	3	Vanilla Cupcake Recipe	Prepare vanilla batter, bake in cupcake moulds and decorate with frosting.
4	1	4	Red Velvet Cake Recipe	Prepare red velvet sponge, bake, cool and layer with cream cheese frosting.
\.


--
-- Data for Name: recipe_ingredient; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recipe_ingredient (recipe_id, ingredient_id, quantity_required) FROM stdin;
1	1	0.500
1	2	0.300
1	3	0.250
1	4	0.150
1	5	0.250
1	6	4.000
2	1	0.300
2	2	0.250
2	3	0.200
2	4	0.180
2	6	3.000
3	1	0.250
3	2	0.200
3	3	0.150
3	5	0.150
3	6	2.000
3	7	5.000
4	1	0.450
4	2	0.300
4	3	0.250
4	5	0.200
4	6	4.000
4	8	0.300
\.


--
-- Data for Name: reservation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reservation (reservation_id, business_id, customer_id, dining_table_id, reservation_at, guest_count, reservation_status, notes, duration_minutes) FROM stdin;
1	3	9	1	2026-11-14 12:00:00+05:30	2	booked	Lunch reservation	60
2	3	10	3	2026-11-14 13:00:00+05:30	4	booked	Family lunch	60
3	3	11	5	2026-11-14 19:00:00+05:30	5	booked	Dinner reservation	60
10	3	\N	1	2026-11-14 13:00:00+05:30	4	booked	\N	60
11	3	\N	1	2026-11-14 14:00:00+05:30	2	booked	\N	60
12	3	\N	3	2026-11-14 12:00:00+05:30	3	booked	\N	60
\.


--
-- Data for Name: restaurant_item; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.restaurant_item (business_id, product_id, preparation_time_minutes, kitchen_station) FROM stdin;
3	9	12	Main Kitchen
3	10	20	Main Kitchen
3	11	15	Main Kitchen
3	12	10	Frying Station
3	13	5	Beverage Counter
\.


--
-- Name: bouquet_assembly_assembly_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bouquet_assembly_assembly_id_seq', 2, true);


--
-- Name: business_business_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.business_business_id_seq', 4, true);


--
-- Name: business_type_business_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.business_type_business_type_id_seq', 6, true);


--
-- Name: customer_customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.customer_customer_id_seq', 16, true);


--
-- Name: dining_table_dining_table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.dining_table_dining_table_id_seq', 5, true);


--
-- Name: employee_employee_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.employee_employee_id_seq', 24, true);


--
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_category_expense_category_id_seq', 10, true);


--
-- Name: expense_expense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expense_expense_id_seq', 16, true);


--
-- Name: ingredient_ingredient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ingredient_ingredient_id_seq', 8, true);


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.inventory_inventory_id_seq', 21, true);


--
-- Name: module_module_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.module_module_id_seq', 12, true);


--
-- Name: order_details_order_detail_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_details_order_detail_id_seq', 42, true);


--
-- Name: order_fulfillment_fulfillment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_fulfillment_fulfillment_id_seq', 2, true);


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 15, true);


--
-- Name: product_product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_product_id_seq', 21, true);


--
-- Name: product_variant_variant_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_variant_variant_id_seq', 15, true);


--
-- Name: production_batch_batch_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.production_batch_batch_id_seq', 6, true);


--
-- Name: recipe_recipe_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.recipe_recipe_id_seq', 4, true);


--
-- Name: reservation_reservation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reservation_reservation_id_seq', 14, true);


--
-- Name: role_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_role_id_seq', 8, true);


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.supplier_supplier_id_seq', 6, true);


--
-- PostgreSQL database dump complete
--

\unrestrict hCxPVS6rUQVDwztJRcsmIryall8bp4kNUtG5fkBqk7xqODkruj5e2cTV3ewMWxA

