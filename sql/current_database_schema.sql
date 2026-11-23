--
-- PostgreSQL database dump
--

\restrict Wsb382hz9uVSz36jb0pnjuTbOrSntCHCyMpRptF0bdxbFS8ja61q5uWdPWyi5Nt

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
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: assemble_bouquet(bigint, bigint, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assemble_bouquet(p_business_id bigint, p_bouquet_product_id bigint, p_quantity integer) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_assembly_id BIGINT;
    v_component RECORD;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'Assembly quantity must be positive';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM product p
        WHERE p.business_id = p_business_id
          AND p.product_id = p_bouquet_product_id
          AND p.category = 'Bouquets'
    ) THEN
        RAISE EXCEPTION 'Invalid bouquet or business';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM bouquet_component
        WHERE bouquet_product_id = p_bouquet_product_id
    ) THEN
        RAISE EXCEPTION 'Bouquet has no defined components';
    END IF;

    -- Lock and deduct component inventory
    FOR v_component IN
        SELECT
            bc.flower_product_id,
            bc.quantity
        FROM bouquet_component bc
        WHERE bc.bouquet_product_id = p_bouquet_product_id
        ORDER BY bc.flower_product_id
    LOOP
        UPDATE inventory
        SET quantity = quantity - (v_component.quantity * p_quantity),
            updated_at = CURRENT_TIMESTAMP
        WHERE business_id = p_business_id
          AND product_id = v_component.flower_product_id
          AND quantity >= (v_component.quantity * p_quantity);

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Insufficient stock for component product ID %',
                v_component.flower_product_id;
        END IF;
    END LOOP;

    -- Increase finished bouquet inventory
    UPDATE inventory
    SET quantity = quantity + p_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE business_id = p_business_id
      AND product_id = p_bouquet_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Finished bouquet inventory record missing';
    END IF;

    -- Record the assembly
    INSERT INTO bouquet_assembly (
        business_id,
        bouquet_product_id,
        quantity_assembled
    )
    VALUES (
        p_business_id,
        p_bouquet_product_id,
        p_quantity
    )
    RETURNING assembly_id INTO v_assembly_id;

    RETURN v_assembly_id;
END;
$$;


--
-- Name: check_table_availability(bigint, bigint, timestamp with time zone, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_table_availability(p_business_id bigint, p_table_id bigint, p_start timestamp with time zone, p_duration integer, p_guest_count integer) RETURNS TABLE(table_number text, available boolean, reason text)
    LANGUAGE sql
    AS $$
    SELECT
        dt.table_number::TEXT,

        (
            dt.table_status = 'available'
            AND dt.capacity >= p_guest_count
            AND NOT EXISTS (
                SELECT 1
                FROM reservation r
                WHERE r.business_id = dt.business_id
                  AND r.dining_table_id = dt.dining_table_id
                  AND r.reservation_status IN ('booked', 'seated')
                  AND tstzrange(
                      r.reservation_at,
                      r.reservation_end,
                      '[)'
                  ) && tstzrange(
                      p_start,
                      p_start + p_duration * INTERVAL '1 minute',
                      '[)'
                  )
            )
        ),

        CASE
            WHEN dt.table_status = 'inactive'
                THEN 'Table is inactive'
            WHEN dt.table_status = 'occupied'
                THEN 'Table is currently occupied'
            WHEN dt.capacity < p_guest_count
                THEN 'Insufficient table capacity'
            WHEN EXISTS (
                SELECT 1
                FROM reservation r
                WHERE r.business_id = dt.business_id
                  AND r.dining_table_id = dt.dining_table_id
                  AND r.reservation_status IN ('booked', 'seated')
                  AND tstzrange(
                      r.reservation_at,
                      r.reservation_end,
                      '[)'
                  ) && tstzrange(
                      p_start,
                      p_start + p_duration * INTERVAL '1 minute',
                      '[)'
                  )
            )
                THEN 'Table already has an overlapping reservation'
            ELSE 'Table is available'
        END

    FROM dining_table dt
    WHERE dt.business_id = p_business_id
      AND dt.dining_table_id = p_table_id
      AND p_duration > 0
      AND p_guest_count > 0;
$$;


--
-- Name: fulfill_flower_shop_order(bigint); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fulfill_flower_shop_order(p_order_id bigint) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_business_id BIGINT := 4;
    v_status VARCHAR(25);
    v_item RECORD;
BEGIN
    -- Lock the order
    SELECT order_status
    INTO v_status
    FROM orders
    WHERE business_id = v_business_id
      AND order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % does not exist in the flower shop',
            p_order_id;
    END IF;

    IF v_status <> 'completed' THEN
        RAISE EXCEPTION 'Order % is not completed. Current status: %',
            p_order_id, v_status;
    END IF;

    -- Prevent duplicate stock deduction
    IF EXISTS (
        SELECT 1
        FROM order_fulfillment
        WHERE business_id = v_business_id
          AND order_id = p_order_id
    ) THEN
        RAISE EXCEPTION 'Order % has already been fulfilled',
            p_order_id;
    END IF;

    -- Process each order item in consistent product order
    FOR v_item IN
        SELECT product_id, quantity_ordered
        FROM order_details
        WHERE business_id = v_business_id
          AND order_id = p_order_id
        ORDER BY product_id
    LOOP
        UPDATE inventory
        SET quantity = quantity - v_item.quantity_ordered,
            updated_at = CURRENT_TIMESTAMP
        WHERE business_id = v_business_id
          AND product_id = v_item.product_id
          AND quantity >= v_item.quantity_ordered;

        IF NOT FOUND THEN
            RAISE EXCEPTION
                'Insufficient inventory for product ID % in order %',
                v_item.product_id, p_order_id;
        END IF;
    END LOOP;

    -- Record successful fulfillment
    INSERT INTO order_fulfillment (business_id, order_id)
    VALUES (v_business_id, p_order_id);

    RETURN FORMAT('Order %s fulfilled successfully.', p_order_id);
END;
$$;


--
-- Name: validate_reservation_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_reservation_capacity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_capacity INTEGER;
BEGIN
    IF NEW.dining_table_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT capacity
    INTO v_capacity
    FROM dining_table
    WHERE business_id = NEW.business_id
      AND dining_table_id = NEW.dining_table_id;

    IF NEW.guest_count > v_capacity THEN
        RAISE EXCEPTION
            'Guest count (%) exceeds table capacity (%)',
            NEW.guest_count, v_capacity;
    END IF;

    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bakery_product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bakery_product (
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    flavour character varying(80),
    shelf_life_days integer,
    CONSTRAINT bakery_product_shelf_life_days_check CHECK (((shelf_life_days IS NULL) OR (shelf_life_days > 0)))
);


--
-- Name: bouquet_assembly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bouquet_assembly (
    assembly_id bigint NOT NULL,
    business_id bigint NOT NULL,
    bouquet_product_id bigint NOT NULL,
    quantity_assembled integer NOT NULL,
    assembly_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT bouquet_assembly_quantity_assembled_check CHECK ((quantity_assembled > 0))
);


--
-- Name: bouquet_assembly_assembly_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.bouquet_assembly ALTER COLUMN assembly_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.bouquet_assembly_assembly_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: bouquet_component; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bouquet_component (
    bouquet_product_id bigint NOT NULL,
    flower_product_id bigint NOT NULL,
    quantity numeric(12,3) NOT NULL,
    CONSTRAINT bouquet_component_check CHECK ((bouquet_product_id <> flower_product_id)),
    CONSTRAINT bouquet_component_quantity_check CHECK ((quantity > (0)::numeric))
);


--
-- Name: business; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business (
    business_id bigint NOT NULL,
    business_type_id bigint NOT NULL,
    business_name character varying(150) NOT NULL,
    currency_code character(3) DEFAULT 'INR'::bpchar NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: business_business_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.business ALTER COLUMN business_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.business_business_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: business_module; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_module (
    business_id bigint NOT NULL,
    module_id bigint NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    activated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: business_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_type (
    business_type_id bigint NOT NULL,
    type_name character varying(80) NOT NULL,
    description text
);


--
-- Name: business_type_business_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.business_type ALTER COLUMN business_type_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.business_type_business_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: business_type_module; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_type_module (
    business_type_id bigint NOT NULL,
    module_id bigint NOT NULL,
    default_enabled boolean DEFAULT true NOT NULL
);


--
-- Name: customer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer (
    customer_id bigint NOT NULL,
    business_id bigint NOT NULL,
    customer_name character varying(120) NOT NULL,
    phone character varying(25),
    email character varying(254),
    address text,
    registered_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: customer_customer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.customer ALTER COLUMN customer_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.customer_customer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: dining_table; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dining_table (
    dining_table_id bigint NOT NULL,
    business_id bigint NOT NULL,
    table_number character varying(20) NOT NULL,
    capacity integer NOT NULL,
    table_status character varying(20) DEFAULT 'available'::character varying NOT NULL,
    CONSTRAINT dining_table_capacity_check CHECK ((capacity > 0)),
    CONSTRAINT dining_table_table_status_check CHECK (((table_status)::text = ANY ((ARRAY['available'::character varying, 'occupied'::character varying, 'inactive'::character varying])::text[])))
);


--
-- Name: dining_table_dining_table_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.dining_table ALTER COLUMN dining_table_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.dining_table_dining_table_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: employee; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee (
    employee_id bigint NOT NULL,
    business_id bigint NOT NULL,
    role_id bigint,
    full_name character varying(120) NOT NULL,
    phone character varying(25),
    email character varying(254),
    address text,
    hire_date date,
    salary numeric(12,2),
    CONSTRAINT employee_salary_check CHECK (((salary IS NULL) OR (salary >= (0)::numeric)))
);


--
-- Name: employee_employee_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.employee ALTER COLUMN employee_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.employee_employee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expense; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense (
    expense_id bigint NOT NULL,
    business_id bigint NOT NULL,
    expense_category_id bigint NOT NULL,
    amount numeric(12,2) NOT NULL,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_method character varying(30),
    description text,
    CONSTRAINT expense_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: expense_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expense_category (
    expense_category_id bigint NOT NULL,
    business_id bigint NOT NULL,
    category_name character varying(80) NOT NULL
);


--
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expense_category ALTER COLUMN expense_category_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expense_category_expense_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: expense_expense_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.expense ALTER COLUMN expense_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.expense_expense_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: flower_product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flower_product (
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    flower_type character varying(80) NOT NULL,
    color character varying(50)
);


--
-- Name: ingredient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredient (
    ingredient_id bigint NOT NULL,
    business_id bigint NOT NULL,
    ingredient_name character varying(120) NOT NULL,
    unit character varying(30) NOT NULL
);


--
-- Name: ingredient_ingredient_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.ingredient ALTER COLUMN ingredient_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ingredient_ingredient_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory (
    inventory_id bigint NOT NULL,
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity numeric(12,3) DEFAULT 0 NOT NULL,
    reorder_level numeric(12,3) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT inventory_quantity_check CHECK ((quantity >= (0)::numeric)),
    CONSTRAINT inventory_reorder_level_check CHECK ((reorder_level >= (0)::numeric))
);


--
-- Name: inventory_inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inventory ALTER COLUMN inventory_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inventory_inventory_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: module; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module (
    module_id bigint NOT NULL,
    module_name character varying(80) NOT NULL,
    module_key character varying(80) NOT NULL,
    description text
);


--
-- Name: module_module_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.module ALTER COLUMN module_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.module_module_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_details (
    order_detail_id bigint NOT NULL,
    business_id bigint NOT NULL,
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity_ordered numeric(12,3) NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    line_total numeric(14,2) GENERATED ALWAYS AS (round((quantity_ordered * unit_price), 2)) STORED,
    variant_id bigint,
    CONSTRAINT order_details_quantity_ordered_check CHECK ((quantity_ordered > (0)::numeric)),
    CONSTRAINT order_details_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: order_details_order_detail_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.order_details ALTER COLUMN order_detail_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_details_order_detail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: order_fulfillment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_fulfillment (
    fulfillment_id bigint NOT NULL,
    business_id bigint NOT NULL,
    order_id bigint NOT NULL,
    fulfilled_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: order_fulfillment_fulfillment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.order_fulfillment ALTER COLUMN fulfillment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_fulfillment_fulfillment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    order_id bigint NOT NULL,
    business_id bigint NOT NULL,
    customer_id bigint,
    employee_id bigint,
    order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    order_status character varying(25) DEFAULT 'placed'::character varying NOT NULL,
    payment_method character varying(30),
    payment_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    delivery_date timestamp with time zone,
    delivery_status character varying(25),
    CONSTRAINT orders_delivery_status_check CHECK (((delivery_status IS NULL) OR ((delivery_status)::text = ANY ((ARRAY['not_required'::character varying, 'pending'::character varying, 'preparing'::character varying, 'dispatched'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[])))),
    CONSTRAINT orders_order_status_check CHECK (((order_status)::text = ANY ((ARRAY['draft'::character varying, 'placed'::character varying, 'processing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'partially_paid'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.orders ALTER COLUMN order_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_order_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    product_id bigint NOT NULL,
    business_id bigint NOT NULL,
    product_name character varying(150) NOT NULL,
    category character varying(80),
    description text,
    unit_price numeric(12,2) NOT NULL,
    cost_price numeric(12,2),
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT product_cost_price_check CHECK (((cost_price IS NULL) OR (cost_price >= (0)::numeric))),
    CONSTRAINT product_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: product_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.product ALTER COLUMN product_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_product_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: product_supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_supplier (
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    supplier_id bigint NOT NULL,
    supplier_price numeric(12,2),
    CONSTRAINT product_supplier_supplier_price_check CHECK (((supplier_price IS NULL) OR (supplier_price >= (0)::numeric)))
);


--
-- Name: product_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variant (
    variant_id bigint NOT NULL,
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    sku character varying(80),
    size_label character varying(40),
    color character varying(50),
    material character varying(80),
    additional_price numeric(12,2) DEFAULT 0 NOT NULL,
    variant_quantity numeric(12,3) DEFAULT 0 NOT NULL,
    CONSTRAINT product_variant_additional_price_check CHECK ((additional_price >= (0)::numeric)),
    CONSTRAINT product_variant_variant_quantity_check CHECK ((variant_quantity >= (0)::numeric))
);


--
-- Name: product_variant_variant_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.product_variant ALTER COLUMN variant_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.product_variant_variant_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: production_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_batch (
    batch_id bigint NOT NULL,
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    batch_code character varying(60) NOT NULL,
    production_date date,
    expiry_date date,
    quantity_produced numeric(12,3) NOT NULL,
    CONSTRAINT production_batch_check CHECK (((expiry_date IS NULL) OR (production_date IS NULL) OR (expiry_date >= production_date))),
    CONSTRAINT production_batch_quantity_produced_check CHECK ((quantity_produced > (0)::numeric))
);


--
-- Name: production_batch_batch_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.production_batch ALTER COLUMN batch_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.production_batch_batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: recipe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe (
    recipe_id bigint NOT NULL,
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    recipe_name character varying(120) NOT NULL,
    instructions text
);


--
-- Name: recipe_ingredient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipe_ingredient (
    recipe_id bigint NOT NULL,
    ingredient_id bigint NOT NULL,
    quantity_required numeric(12,3) NOT NULL,
    CONSTRAINT recipe_ingredient_quantity_required_check CHECK ((quantity_required > (0)::numeric))
);


--
-- Name: recipe_recipe_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.recipe ALTER COLUMN recipe_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.recipe_recipe_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reservation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reservation (
    reservation_id bigint NOT NULL,
    business_id bigint NOT NULL,
    customer_id bigint,
    dining_table_id bigint,
    reservation_at timestamp with time zone NOT NULL,
    guest_count integer NOT NULL,
    reservation_status character varying(20) DEFAULT 'booked'::character varying NOT NULL,
    notes text,
    duration_minutes integer DEFAULT 60 NOT NULL,
    reservation_end timestamp with time zone GENERATED ALWAYS AS ((((reservation_at AT TIME ZONE 'UTC'::text) + ((duration_minutes)::double precision * '00:01:00'::interval)) AT TIME ZONE 'UTC'::text)) STORED,
    CONSTRAINT reservation_duration_minutes_check CHECK ((duration_minutes > 0)),
    CONSTRAINT reservation_guest_count_check CHECK ((guest_count > 0)),
    CONSTRAINT reservation_reservation_status_check CHECK (((reservation_status)::text = ANY ((ARRAY['booked'::character varying, 'seated'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'no_show'::character varying])::text[])))
);


--
-- Name: reservation_reservation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reservation ALTER COLUMN reservation_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reservation_reservation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: restaurant_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restaurant_item (
    business_id bigint NOT NULL,
    product_id bigint NOT NULL,
    preparation_time_minutes integer,
    kitchen_station character varying(80),
    CONSTRAINT restaurant_item_preparation_time_minutes_check CHECK (((preparation_time_minutes IS NULL) OR (preparation_time_minutes >= 0)))
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    role_id bigint NOT NULL,
    role_name character varying(60) NOT NULL
);


--
-- Name: role_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.role ALTER COLUMN role_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.role_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier (
    supplier_id bigint NOT NULL,
    business_id bigint NOT NULL,
    supplier_name character varying(150) NOT NULL,
    phone character varying(25),
    email character varying(254),
    address text
);


--
-- Name: supplier_supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.supplier ALTER COLUMN supplier_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.supplier_supplier_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: v_bouquet_production; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_bouquet_production AS
 SELECT b.business_id,
    b.product_id AS bouquet_product_id,
    b.product_name AS bouquet_name,
    b.unit_price,
    i.quantity AS finished_stock,
    COALESCE(sum(ba.quantity_assembled), (0)::bigint) AS total_assembled,
    ((COALESCE(sum(ba.quantity_assembled), (0)::bigint))::numeric * COALESCE(costs.component_cost, (0)::numeric)) AS total_component_cost,
    component_stock.assemblable AS currently_assemblable
   FROM ((((public.product b
     JOIN public.inventory i ON (((i.business_id = b.business_id) AND (i.product_id = b.product_id))))
     LEFT JOIN public.bouquet_assembly ba ON (((ba.business_id = b.business_id) AND (ba.bouquet_product_id = b.product_id))))
     LEFT JOIN LATERAL ( SELECT sum((bc.quantity * f.cost_price)) AS component_cost
           FROM (public.bouquet_component bc
             JOIN public.product f ON (((f.business_id = b.business_id) AND (f.product_id = bc.flower_product_id))))
          WHERE (bc.bouquet_product_id = b.product_id)) costs ON (true))
     LEFT JOIN LATERAL ( SELECT min((i2.quantity / bc.quantity)) AS assemblable_ratio,
            min(floor((i2.quantity / bc.quantity))) AS assemblable
           FROM (public.bouquet_component bc
             JOIN public.inventory i2 ON (((i2.business_id = b.business_id) AND (i2.product_id = bc.flower_product_id))))
          WHERE (bc.bouquet_product_id = b.product_id)) component_stock ON (true))
  WHERE ((b.category)::text = 'Bouquets'::text)
  GROUP BY b.business_id, b.product_id, b.product_name, b.unit_price, i.quantity, costs.component_cost, component_stock.assemblable;


--
-- Name: v_bouquet_profitability; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_bouquet_profitability AS
 SELECT b.business_id,
    b.product_id AS bouquet_product_id,
    b.product_name AS bouquet_name,
    b.unit_price AS selling_price,
    COALESCE(sum((bc.quantity * flower.cost_price)), (0)::numeric) AS component_cost,
    (b.unit_price - COALESCE(sum((bc.quantity * flower.cost_price)), (0)::numeric)) AS gross_margin,
    round((((b.unit_price - COALESCE(sum((bc.quantity * flower.cost_price)), (0)::numeric)) / NULLIF(b.unit_price, (0)::numeric)) * (100)::numeric), 2) AS margin_percentage
   FROM ((public.product b
     JOIN public.bouquet_component bc ON ((bc.bouquet_product_id = b.product_id)))
     JOIN public.product flower ON (((flower.product_id = bc.flower_product_id) AND (flower.business_id = b.business_id))))
  WHERE ((b.business_id = 4) AND ((b.category)::text = 'Bouquets'::text))
  GROUP BY b.business_id, b.product_id, b.product_name, b.unit_price;


--
-- Name: v_flower_assembly_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_flower_assembly_analytics AS
 SELECT business_id,
    bouquet_product_id,
    bouquet_name,
    total_assembled,
    finished_stock,
    currently_assemblable,
    total_component_cost,
    COALESCE(( SELECT sum(ba.quantity_assembled) AS sum
           FROM public.bouquet_assembly ba
          WHERE ((ba.business_id = vp.business_id) AND (ba.bouquet_product_id = vp.bouquet_product_id) AND (ba.assembly_date >= CURRENT_DATE))), (0)::bigint) AS assembled_today
   FROM public.v_bouquet_production vp
  WHERE (business_id = 4);


--
-- Name: v_flower_low_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_flower_low_stock AS
 SELECT i.business_id,
    p.product_id,
    p.product_name,
    p.category,
    i.quantity AS current_stock,
    i.reorder_level,
    (i.reorder_level - i.quantity) AS quantity_below_reorder_level
   FROM (public.inventory i
     JOIN public.product p ON (((p.business_id = i.business_id) AND (p.product_id = i.product_id))))
  WHERE ((i.business_id = 4) AND (i.quantity <= i.reorder_level));


--
-- Name: v_flower_product_sales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_flower_product_sales AS
 SELECT p.business_id,
    p.product_id,
    p.product_name,
    p.category,
    COALESCE(sum(
        CASE
            WHEN (o.order_id IS NOT NULL) THEN od.quantity_ordered
            ELSE (0)::numeric
        END), (0)::numeric) AS total_quantity_sold,
    count(DISTINCT o.order_id) AS orders_count,
    COALESCE(sum(
        CASE
            WHEN (o.order_id IS NOT NULL) THEN od.line_total
            ELSE (0)::numeric
        END), (0)::numeric) AS total_sales_value
   FROM ((public.product p
     LEFT JOIN public.order_details od ON (((od.business_id = p.business_id) AND (od.product_id = p.product_id))))
     LEFT JOIN public.orders o ON (((o.business_id = od.business_id) AND (o.order_id = od.order_id) AND ((o.order_status)::text <> 'cancelled'::text))))
  WHERE (p.business_id = 4)
  GROUP BY p.business_id, p.product_id, p.product_name, p.category;


--
-- Name: v_flower_shop_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_flower_shop_dashboard AS
 SELECT business_id,
    business_name,
    ( SELECT count(*) AS count
           FROM public.product p
          WHERE ((p.business_id = b.business_id) AND ((p.category)::text <> 'Bouquets'::text))) AS flower_product_count,
    ( SELECT count(*) AS count
           FROM public.product p
          WHERE ((p.business_id = b.business_id) AND ((p.category)::text = 'Bouquets'::text))) AS bouquet_count,
    ( SELECT count(*) AS count
           FROM public.orders o
          WHERE (o.business_id = b.business_id)) AS total_orders,
    ( SELECT count(*) AS count
           FROM public.orders o
          WHERE ((o.business_id = b.business_id) AND ((o.order_status)::text = 'completed'::text))) AS completed_orders,
    ( SELECT count(*) AS count
           FROM public.orders o
          WHERE ((o.business_id = b.business_id) AND ((o.order_status)::text = 'placed'::text))) AS pending_orders,
    ( SELECT COALESCE(sum(od.line_total), (0)::numeric) AS "coalesce"
           FROM (public.order_details od
             JOIN public.orders o ON (((o.business_id = od.business_id) AND (o.order_id = od.order_id))))
          WHERE (od.business_id = b.business_id)) AS total_order_value,
    ( SELECT COALESCE(sum(i.quantity), (0)::numeric) AS "coalesce"
           FROM (public.inventory i
             JOIN public.product p ON (((p.business_id = i.business_id) AND (p.product_id = i.product_id))))
          WHERE ((i.business_id = b.business_id) AND ((p.category)::text = 'Bouquets'::text))) AS finished_bouquet_stock,
    ( SELECT count(*) AS count
           FROM public.inventory i
          WHERE ((i.business_id = b.business_id) AND (i.quantity <= i.reorder_level))) AS low_stock_count
   FROM public.business b
  WHERE (business_id = 4);


--
-- Name: v_low_stock; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_low_stock AS
 SELECT i.business_id,
    p.product_id,
    p.product_name,
    i.quantity,
    i.reorder_level
   FROM (public.inventory i
     JOIN public.product p ON (((p.business_id = i.business_id) AND (p.product_id = i.product_id))))
  WHERE (i.quantity <= i.reorder_level);


--
-- Name: v_order_totals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_order_totals AS
 SELECT o.business_id,
    o.order_id,
    o.order_date,
    o.order_status,
    o.payment_status,
    (COALESCE(sum(od.line_total), (0)::numeric))::numeric(14,2) AS total_amount
   FROM (public.orders o
     LEFT JOIN public.order_details od ON (((od.business_id = o.business_id) AND (od.order_id = o.order_id))))
  GROUP BY o.business_id, o.order_id, o.order_date, o.order_status, o.payment_status;


--
-- Name: v_monthly_sales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_monthly_sales AS
 SELECT business_id,
    (date_trunc('month'::text, order_date))::date AS sales_month,
    (sum(total_amount))::numeric(14,2) AS revenue,
    count(*) AS order_count
   FROM public.v_order_totals
  WHERE ((order_status)::text <> 'cancelled'::text)
  GROUP BY business_id, (date_trunc('month'::text, order_date));


--
-- Name: v_restaurant_dashboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_restaurant_dashboard AS
 SELECT business_id,
    business_name,
    ( SELECT count(*) AS count
           FROM public.product p
          WHERE (p.business_id = b.business_id)) AS total_menu_items,
    ( SELECT count(*) AS count
           FROM public.orders o
          WHERE (o.business_id = b.business_id)) AS total_orders,
    ( SELECT count(*) AS count
           FROM public.orders o
          WHERE ((o.business_id = b.business_id) AND ((o.order_status)::text = 'completed'::text))) AS completed_orders,
    ( SELECT count(*) AS count
           FROM public.orders o
          WHERE ((o.business_id = b.business_id) AND ((o.order_status)::text = 'placed'::text))) AS pending_orders,
    ( SELECT COALESCE(sum(od.line_total), (0)::numeric) AS "coalesce"
           FROM public.order_details od
          WHERE (od.business_id = b.business_id)) AS total_order_value,
    ( SELECT count(*) AS count
           FROM public.reservation r
          WHERE (r.business_id = b.business_id)) AS total_reservations,
    ( SELECT COALESCE(sum(r.guest_count), (0)::bigint) AS "coalesce"
           FROM public.reservation r
          WHERE ((r.business_id = b.business_id) AND ((r.reservation_status)::text = ANY ((ARRAY['booked'::character varying, 'seated'::character varying])::text[])))) AS expected_guests
   FROM public.business b
  WHERE (business_type_id = 3);


--
-- Name: v_restaurant_table_schedule; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_restaurant_table_schedule AS
 SELECT dt.business_id,
    dt.dining_table_id,
    dt.table_number,
    dt.capacity,
    dt.table_status AS operational_status,
    r.reservation_id,
    r.reservation_at,
    r.reservation_end,
    r.reservation_status,
    r.guest_count
   FROM (public.dining_table dt
     LEFT JOIN public.reservation r ON (((r.business_id = dt.business_id) AND (r.dining_table_id = dt.dining_table_id) AND ((r.reservation_status)::text = ANY ((ARRAY['booked'::character varying, 'seated'::character varying])::text[])))));


--
-- Name: bakery_product bakery_product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bakery_product
    ADD CONSTRAINT bakery_product_pkey PRIMARY KEY (product_id);


--
-- Name: bouquet_assembly bouquet_assembly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bouquet_assembly
    ADD CONSTRAINT bouquet_assembly_pkey PRIMARY KEY (assembly_id);


--
-- Name: bouquet_component bouquet_component_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bouquet_component
    ADD CONSTRAINT bouquet_component_pkey PRIMARY KEY (bouquet_product_id, flower_product_id);


--
-- Name: business business_business_id_business_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business
    ADD CONSTRAINT business_business_id_business_type_id_key UNIQUE (business_id, business_type_id);


--
-- Name: business_module business_module_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_module
    ADD CONSTRAINT business_module_pkey PRIMARY KEY (business_id, module_id);


--
-- Name: business business_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business
    ADD CONSTRAINT business_pkey PRIMARY KEY (business_id);


--
-- Name: business_type_module business_type_module_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_type_module
    ADD CONSTRAINT business_type_module_pkey PRIMARY KEY (business_type_id, module_id);


--
-- Name: business_type business_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_type
    ADD CONSTRAINT business_type_pkey PRIMARY KEY (business_type_id);


--
-- Name: business_type business_type_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_type
    ADD CONSTRAINT business_type_type_name_key UNIQUE (type_name);


--
-- Name: customer customer_business_id_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_business_id_customer_id_key UNIQUE (business_id, customer_id);


--
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (customer_id);


--
-- Name: dining_table dining_table_business_id_dining_table_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dining_table
    ADD CONSTRAINT dining_table_business_id_dining_table_id_key UNIQUE (business_id, dining_table_id);


--
-- Name: dining_table dining_table_business_id_table_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dining_table
    ADD CONSTRAINT dining_table_business_id_table_number_key UNIQUE (business_id, table_number);


--
-- Name: dining_table dining_table_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dining_table
    ADD CONSTRAINT dining_table_pkey PRIMARY KEY (dining_table_id);


--
-- Name: employee employee_business_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_business_id_employee_id_key UNIQUE (business_id, employee_id);


--
-- Name: employee employee_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_pkey PRIMARY KEY (employee_id);


--
-- Name: expense_category expense_category_business_id_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_category
    ADD CONSTRAINT expense_category_business_id_category_name_key UNIQUE (business_id, category_name);


--
-- Name: expense_category expense_category_business_id_expense_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_category
    ADD CONSTRAINT expense_category_business_id_expense_category_id_key UNIQUE (business_id, expense_category_id);


--
-- Name: expense_category expense_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_category
    ADD CONSTRAINT expense_category_pkey PRIMARY KEY (expense_category_id);


--
-- Name: expense expense_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense
    ADD CONSTRAINT expense_pkey PRIMARY KEY (expense_id);


--
-- Name: flower_product flower_product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flower_product
    ADD CONSTRAINT flower_product_pkey PRIMARY KEY (product_id);


--
-- Name: ingredient ingredient_business_id_ingredient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_business_id_ingredient_id_key UNIQUE (business_id, ingredient_id);


--
-- Name: ingredient ingredient_business_id_ingredient_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_business_id_ingredient_name_key UNIQUE (business_id, ingredient_name);


--
-- Name: ingredient ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_pkey PRIMARY KEY (ingredient_id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id);


--
-- Name: inventory inventory_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_product_id_key UNIQUE (product_id);


--
-- Name: module module_module_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module
    ADD CONSTRAINT module_module_key_key UNIQUE (module_key);


--
-- Name: module module_module_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module
    ADD CONSTRAINT module_module_name_key UNIQUE (module_name);


--
-- Name: module module_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module
    ADD CONSTRAINT module_pkey PRIMARY KEY (module_id);


--
-- Name: reservation no_overlapping_table_reservations; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT no_overlapping_table_reservations EXCLUDE USING gist (business_id WITH =, dining_table_id WITH =, tstzrange(reservation_at, reservation_end, '[)'::text) WITH &&) WHERE (((dining_table_id IS NOT NULL) AND ((reservation_status)::text = ANY ((ARRAY['booked'::character varying, 'seated'::character varying])::text[]))));


--
-- Name: order_details order_details_order_product_variant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_order_product_variant_key UNIQUE (order_id, product_id, variant_id);


--
-- Name: order_details order_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_pkey PRIMARY KEY (order_detail_id);


--
-- Name: order_fulfillment order_fulfillment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment
    ADD CONSTRAINT order_fulfillment_pkey PRIMARY KEY (fulfillment_id);


--
-- Name: orders orders_business_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_order_id_key UNIQUE (business_id, order_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: product product_business_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_business_id_product_id_key UNIQUE (business_id, product_id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- Name: product_supplier product_supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_supplier
    ADD CONSTRAINT product_supplier_pkey PRIMARY KEY (product_id, supplier_id);


--
-- Name: product_variant product_variant_business_id_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_business_id_sku_key UNIQUE (business_id, sku);


--
-- Name: product_variant product_variant_business_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_business_id_variant_id_key UNIQUE (business_id, variant_id);


--
-- Name: product_variant product_variant_business_product_variant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_business_product_variant_key UNIQUE (business_id, product_id, variant_id);


--
-- Name: product_variant product_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_pkey PRIMARY KEY (variant_id);


--
-- Name: production_batch production_batch_business_id_batch_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batch
    ADD CONSTRAINT production_batch_business_id_batch_code_key UNIQUE (business_id, batch_code);


--
-- Name: production_batch production_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batch
    ADD CONSTRAINT production_batch_pkey PRIMARY KEY (batch_id);


--
-- Name: recipe_ingredient recipe_ingredient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT recipe_ingredient_pkey PRIMARY KEY (recipe_id, ingredient_id);


--
-- Name: recipe recipe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_pkey PRIMARY KEY (recipe_id);


--
-- Name: recipe recipe_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_product_id_key UNIQUE (product_id);


--
-- Name: reservation reservation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT reservation_pkey PRIMARY KEY (reservation_id);


--
-- Name: restaurant_item restaurant_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_item
    ADD CONSTRAINT restaurant_item_pkey PRIMARY KEY (product_id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (role_id);


--
-- Name: role role_role_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_name_key UNIQUE (role_name);


--
-- Name: supplier supplier_business_id_supplier_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_business_id_supplier_id_key UNIQUE (business_id, supplier_id);


--
-- Name: supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (supplier_id);


--
-- Name: order_fulfillment unique_order_fulfillment; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment
    ADD CONSTRAINT unique_order_fulfillment UNIQUE (business_id, order_id);


--
-- Name: idx_customer_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_business ON public.customer USING btree (business_id);


--
-- Name: idx_employee_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employee_business ON public.employee USING btree (business_id);


--
-- Name: idx_expense_business_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expense_business_date ON public.expense USING btree (business_id, expense_date);


--
-- Name: idx_inventory_low_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_low_stock ON public.inventory USING btree (business_id, quantity, reorder_level);


--
-- Name: idx_order_details_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_details_product ON public.order_details USING btree (business_id, product_id);


--
-- Name: idx_orders_business_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_business_date ON public.orders USING btree (business_id, order_date);


--
-- Name: idx_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer ON public.orders USING btree (business_id, customer_id);


--
-- Name: idx_product_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_business ON public.product USING btree (business_id);


--
-- Name: reservation trg_validate_reservation_capacity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_reservation_capacity BEFORE INSERT OR UPDATE OF business_id, dining_table_id, guest_count ON public.reservation FOR EACH ROW EXECUTE FUNCTION public.validate_reservation_capacity();


--
-- Name: bakery_product bakery_product_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bakery_product
    ADD CONSTRAINT bakery_product_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: bouquet_assembly bouquet_assembly_bouquet_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bouquet_assembly
    ADD CONSTRAINT bouquet_assembly_bouquet_product_id_fkey FOREIGN KEY (bouquet_product_id) REFERENCES public.product(product_id);


--
-- Name: bouquet_assembly bouquet_assembly_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bouquet_assembly
    ADD CONSTRAINT bouquet_assembly_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id);


--
-- Name: bouquet_component bouquet_component_bouquet_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bouquet_component
    ADD CONSTRAINT bouquet_component_bouquet_product_id_fkey FOREIGN KEY (bouquet_product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: bouquet_component bouquet_component_flower_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bouquet_component
    ADD CONSTRAINT bouquet_component_flower_product_id_fkey FOREIGN KEY (flower_product_id) REFERENCES public.flower_product(product_id) ON DELETE RESTRICT;


--
-- Name: business business_business_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business
    ADD CONSTRAINT business_business_type_id_fkey FOREIGN KEY (business_type_id) REFERENCES public.business_type(business_type_id);


--
-- Name: business_module business_module_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_module
    ADD CONSTRAINT business_module_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: business_module business_module_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_module
    ADD CONSTRAINT business_module_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.module(module_id) ON DELETE RESTRICT;


--
-- Name: business_type_module business_type_module_business_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_type_module
    ADD CONSTRAINT business_type_module_business_type_id_fkey FOREIGN KEY (business_type_id) REFERENCES public.business_type(business_type_id) ON DELETE CASCADE;


--
-- Name: business_type_module business_type_module_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_type_module
    ADD CONSTRAINT business_type_module_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.module(module_id) ON DELETE RESTRICT;


--
-- Name: customer customer_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: dining_table dining_table_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dining_table
    ADD CONSTRAINT dining_table_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: employee employee_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: employee employee_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee
    ADD CONSTRAINT employee_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.role(role_id) ON DELETE SET NULL;


--
-- Name: expense expense_business_id_expense_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense
    ADD CONSTRAINT expense_business_id_expense_category_id_fkey FOREIGN KEY (business_id, expense_category_id) REFERENCES public.expense_category(business_id, expense_category_id) ON DELETE RESTRICT;


--
-- Name: expense_category expense_category_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expense_category
    ADD CONSTRAINT expense_category_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: order_fulfillment fk_fulfillment_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_fulfillment
    ADD CONSTRAINT fk_fulfillment_order FOREIGN KEY (business_id, order_id) REFERENCES public.orders(business_id, order_id) ON DELETE RESTRICT;


--
-- Name: flower_product flower_product_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flower_product
    ADD CONSTRAINT flower_product_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: ingredient ingredient_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredient
    ADD CONSTRAINT ingredient_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: inventory inventory_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: order_details order_details_business_id_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_business_id_order_id_fkey FOREIGN KEY (business_id, order_id) REFERENCES public.orders(business_id, order_id) ON DELETE CASCADE;


--
-- Name: order_details order_details_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE RESTRICT;


--
-- Name: order_details order_details_variant_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_details
    ADD CONSTRAINT order_details_variant_fkey FOREIGN KEY (business_id, product_id, variant_id) REFERENCES public.product_variant(business_id, product_id, variant_id);


--
-- Name: orders orders_business_id_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_customer_id_fkey FOREIGN KEY (business_id, customer_id) REFERENCES public.customer(business_id, customer_id) ON DELETE RESTRICT;


--
-- Name: orders orders_business_id_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_employee_id_fkey FOREIGN KEY (business_id, employee_id) REFERENCES public.employee(business_id, employee_id) ON DELETE RESTRICT;


--
-- Name: orders orders_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: product product_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: product_supplier product_supplier_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_supplier
    ADD CONSTRAINT product_supplier_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: product_supplier product_supplier_business_id_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_supplier
    ADD CONSTRAINT product_supplier_business_id_supplier_id_fkey FOREIGN KEY (business_id, supplier_id) REFERENCES public.supplier(business_id, supplier_id) ON DELETE CASCADE;


--
-- Name: product_variant product_variant_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variant
    ADD CONSTRAINT product_variant_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: production_batch production_batch_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_batch
    ADD CONSTRAINT production_batch_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: recipe recipe_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- Name: recipe recipe_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe
    ADD CONSTRAINT recipe_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: recipe_ingredient recipe_ingredient_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT recipe_ingredient_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(ingredient_id) ON DELETE RESTRICT;


--
-- Name: recipe_ingredient recipe_ingredient_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipe_ingredient
    ADD CONSTRAINT recipe_ingredient_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(recipe_id) ON DELETE CASCADE;


--
-- Name: reservation reservation_business_id_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT reservation_business_id_customer_id_fkey FOREIGN KEY (business_id, customer_id) REFERENCES public.customer(business_id, customer_id) ON DELETE RESTRICT;


--
-- Name: reservation reservation_business_id_dining_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reservation
    ADD CONSTRAINT reservation_business_id_dining_table_id_fkey FOREIGN KEY (business_id, dining_table_id) REFERENCES public.dining_table(business_id, dining_table_id) ON DELETE RESTRICT;


--
-- Name: restaurant_item restaurant_item_business_id_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restaurant_item
    ADD CONSTRAINT restaurant_item_business_id_product_id_fkey FOREIGN KEY (business_id, product_id) REFERENCES public.product(business_id, product_id) ON DELETE CASCADE;


--
-- Name: supplier supplier_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.business(business_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict Wsb382hz9uVSz36jb0pnjuTbOrSntCHCyMpRptF0bdxbFS8ja61q5uWdPWyi5Nt

