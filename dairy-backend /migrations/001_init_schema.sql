-- =====================================================
-- 001_init_schema.sql
-- Initial schema for Dairy Management System
-- Safe for fresh deployments (local / staging / prod)
-- =====================================================

BEGIN;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE customers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE products (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  default_price NUMERIC(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- DAY STATUS
-- =========================
CREATE TABLE day_status (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_date DATE NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL,
  opened_at TIMESTAMP,
  closed_at TIMESTAMP,
  locked_at TIMESTAMP
);

-- =========================
-- DAILY PRODUCT STOCK
-- =========================
CREATE TABLE daily_product_stock (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  plant_load_qty INTEGER NOT NULL CHECK (plant_load_qty >= 0),
  counter_opening_qty NUMERIC,
  counter_closing_qty INTEGER CHECK (counter_closing_qty >= 0),
  returned_to_plant_qty INTEGER CHECK (returned_to_plant_qty >= 0),
  entered_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (day_id, product_id),
  FOREIGN KEY (day_id) REFERENCES day_status(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =========================
-- CUSTOMER DAILY BALANCE
-- =========================
CREATE TABLE customer_daily_balance (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_date DATE NOT NULL,
  customer_id INTEGER NOT NULL,
  opening_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_date, customer_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =========================
-- CUSTOMER PRODUCT PRICES
-- =========================
CREATE TABLE customer_product_prices (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  custom_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (customer_id, product_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =========================
-- INVOICES
-- =========================
CREATE TABLE invoices (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_id VARCHAR NOT NULL UNIQUE,
  day_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  business_date DATE NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  cash_paid NUMERIC(10,2) DEFAULT 0,
  online_paid NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(10,2) DEFAULT 0,
  due NUMERIC(10,2) NOT NULL,
  created_by INTEGER,
  immutable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (day_id) REFERENCES day_status(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =========================
-- SALES
-- =========================
CREATE TABLE sales (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  rate NUMERIC(10,2) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  invoice_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (day_id) REFERENCES day_status(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  mode VARCHAR(20) NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  invoice_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (day_id) REFERENCES day_status(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- =========================
-- LEDGER EVENTS
-- =========================
CREATE TABLE ledger_events (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id INTEGER NOT NULL,
  business_date DATE NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  customer_id INTEGER,
  product_id INTEGER,
  quantity NUMERIC(10,2),
  amount NUMERIC(12,2),
  payment_mode VARCHAR(20),
  reference_id INTEGER,
  reference_table VARCHAR(50),
  notes TEXT,
  invoice_id VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (day_id) REFERENCES day_status(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_ledger_events_customer ON ledger_events(customer_id);
CREATE INDEX idx_ledger_events_day ON ledger_events(day_id);
CREATE INDEX idx_ledger_events_product ON ledger_events(product_id);
CREATE INDEX idx_ledger_events_type ON ledger_events(event_type);

-- =========================
-- STOCK SHORTAGE REASONS
-- =========================
CREATE TABLE stock_shortage_reasons (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  shortage_qty NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  entered_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (day_id, product_id),
  FOREIGN KEY (day_id) REFERENCES day_status(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (entered_by) REFERENCES users(id)
);

-- =========================
-- STOCK SHORTAGE JUSTIFICATION
-- =========================
CREATE TABLE stock_shortage_justification (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  day_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  shortage_qty NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  entered_by INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (day_id, product_id),
  FOREIGN KEY (day_id) REFERENCES day_status(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id)
);

-- =========================
-- AUDIT LOGS
-- =========================
CREATE TABLE audit_logs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER,
  role VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

COMMIT;





-- --
-- -- PostgreSQL database dump
-- --

-- \restrict cc64DHeXC62ft8O9IUbLUCkiXytXfR6mTcBkk2xxeORb7uV5bPs7xFTlXp7KnP0

-- -- Dumped from database version 15.15 (Homebrew)
-- -- Dumped by pg_dump version 15.15 (Homebrew)

-- SET statement_timeout = 0;
-- SET lock_timeout = 0;
-- SET idle_in_transaction_session_timeout = 0;
-- SET client_encoding = 'UTF8';
-- SET standard_conforming_strings = on;
-- SELECT pg_catalog.set_config('search_path', '', false);
-- SET check_function_bodies = false;
-- SET xmloption = content;
-- SET client_min_messages = warning;
-- SET row_security = off;

-- SET default_tablespace = '';

-- SET default_table_access_method = heap;

-- --
-- -- Name: audit_logs; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.audit_logs (
--     id integer NOT NULL,
--     user_id integer,
--     role character varying(20) NOT NULL,
--     action character varying(50) NOT NULL,
--     entity character varying(50) NOT NULL,
--     entity_id character varying(100),
--     details jsonb,
--     created_at timestamp without time zone DEFAULT now()
-- );


-- ALTER TABLE public.audit_logs OWNER TO tamishshrivastava;

-- --
-- -- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.audit_logs_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.audit_logs_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


-- --
-- -- Name: customer_daily_balance; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.customer_daily_balance (
--     id integer NOT NULL,
--     business_date date NOT NULL,
--     customer_id integer NOT NULL,
--     opening_balance numeric(12,2) DEFAULT 0 NOT NULL,
--     closing_balance numeric(12,2),
--     created_at timestamp without time zone DEFAULT now()
-- );


-- ALTER TABLE public.customer_daily_balance OWNER TO tamishshrivastava;

-- --
-- -- Name: customer_daily_balance_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.customer_daily_balance_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.customer_daily_balance_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: customer_daily_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.customer_daily_balance_id_seq OWNED BY public.customer_daily_balance.id;


-- --
-- -- Name: customer_product_prices; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.customer_product_prices (
--     id integer NOT NULL,
--     customer_id integer NOT NULL,
--     product_id integer NOT NULL,
--     custom_price numeric(10,2) NOT NULL,
--     created_at timestamp without time zone DEFAULT now(),
--     updated_at timestamp without time zone DEFAULT now()
-- );


-- ALTER TABLE public.customer_product_prices OWNER TO tamishshrivastava;

-- --
-- -- Name: customer_product_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.customer_product_prices_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.customer_product_prices_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: customer_product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.customer_product_prices_id_seq OWNED BY public.customer_product_prices.id;


-- --
-- -- Name: customers; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.customers (
--     id integer NOT NULL,
--     name character varying(100) NOT NULL,
--     phone character varying(20),
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
--     is_active boolean DEFAULT true
-- );


-- ALTER TABLE public.customers OWNER TO tamishshrivastava;

-- --
-- -- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.customers_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.customers_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


-- --
-- -- Name: daily_product_stock; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.daily_product_stock (
--     id integer NOT NULL,
--     day_id integer NOT NULL,
--     product_id integer NOT NULL,
--     plant_load_qty integer NOT NULL,
--     counter_closing_qty integer,
--     returned_to_plant_qty integer,
--     entered_by integer,
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
--     updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
--     counter_opening_qty numeric,
--     CONSTRAINT daily_product_stock_counter_closing_qty_check CHECK ((counter_closing_qty >= 0)),
--     CONSTRAINT daily_product_stock_plant_load_qty_check CHECK ((plant_load_qty >= 0)),
--     CONSTRAINT daily_product_stock_returned_to_plant_qty_check CHECK ((returned_to_plant_qty >= 0))
-- );


-- ALTER TABLE public.daily_product_stock OWNER TO tamishshrivastava;

-- --
-- -- Name: daily_product_stock_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.daily_product_stock_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.daily_product_stock_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: daily_product_stock_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.daily_product_stock_id_seq OWNED BY public.daily_product_stock.id;


-- --
-- -- Name: day_status; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.day_status (
--     id integer NOT NULL,
--     business_date date NOT NULL,
--     status character varying(20) NOT NULL,
--     opened_at timestamp without time zone,
--     closed_at timestamp without time zone,
--     locked_at timestamp without time zone
-- );


-- ALTER TABLE public.day_status OWNER TO tamishshrivastava;

-- --
-- -- Name: day_status_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.day_status_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.day_status_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: day_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.day_status_id_seq OWNED BY public.day_status.id;


-- --
-- -- Name: invoices; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.invoices (
--     id integer NOT NULL,
--     invoice_id character varying NOT NULL,
--     day_id integer NOT NULL,
--     customer_id integer NOT NULL,
--     business_date date NOT NULL,
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
--     subtotal numeric(10,2) NOT NULL,
--     cash_paid numeric(10,2) DEFAULT 0,
--     online_paid numeric(10,2) DEFAULT 0,
--     total_paid numeric(10,2) DEFAULT 0,
--     due numeric(10,2) NOT NULL,
--     created_by integer,
--     immutable boolean DEFAULT true
-- );


-- ALTER TABLE public.invoices OWNER TO tamishshrivastava;

-- --
-- -- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.invoices_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.invoices_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


-- --
-- -- Name: ledger_events; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.ledger_events (
--     id integer NOT NULL,
--     day_id integer NOT NULL,
--     business_date date NOT NULL,
--     event_type character varying(30) NOT NULL,
--     customer_id integer,
--     product_id integer,
--     quantity numeric(10,2),
--     amount numeric(12,2),
--     payment_mode character varying(20),
--     reference_id integer,
--     reference_table character varying(50),
--     notes text,
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
--     invoice_id character varying
-- );


-- ALTER TABLE public.ledger_events OWNER TO tamishshrivastava;

-- --
-- -- Name: ledger_events_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.ledger_events_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.ledger_events_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: ledger_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.ledger_events_id_seq OWNED BY public.ledger_events.id;


-- --
-- -- Name: payments; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.payments (
--     id integer NOT NULL,
--     day_id integer NOT NULL,
--     customer_id integer NOT NULL,
--     mode character varying(20) NOT NULL,
--     amount numeric(10,2) NOT NULL,
--     created_at timestamp without time zone DEFAULT now(),
--     invoice_id character varying
-- );


-- ALTER TABLE public.payments OWNER TO tamishshrivastava;

-- --
-- -- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.payments_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.payments_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


-- --
-- -- Name: products; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.products (
--     id integer NOT NULL,
--     name character varying(100) NOT NULL,
--     unit character varying(20) NOT NULL,
--     default_price numeric(10,2),
--     is_active boolean DEFAULT true,
--     created_at timestamp without time zone DEFAULT now(),
--     updated_at timestamp without time zone DEFAULT now()
-- );


-- ALTER TABLE public.products OWNER TO tamishshrivastava;

-- --
-- -- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.products_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.products_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


-- --
-- -- Name: sales; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.sales (
--     id integer NOT NULL,
--     day_id integer NOT NULL,
--     customer_id integer NOT NULL,
--     product_id integer NOT NULL,
--     quantity numeric(10,2) NOT NULL,
--     rate numeric(10,2) NOT NULL,
--     amount numeric(10,2) NOT NULL,
--     created_at timestamp without time zone DEFAULT now(),
--     invoice_id character varying
-- );


-- ALTER TABLE public.sales OWNER TO tamishshrivastava;

-- --
-- -- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.sales_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.sales_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


-- --
-- -- Name: stock_shortage_justification; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.stock_shortage_justification (
--     id integer NOT NULL,
--     day_id integer NOT NULL,
--     product_id integer NOT NULL,
--     shortage_qty numeric(10,2) NOT NULL,
--     reason text NOT NULL,
--     entered_by integer NOT NULL,
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
-- );


-- ALTER TABLE public.stock_shortage_justification OWNER TO tamishshrivastava;

-- --
-- -- Name: stock_shortage_justification_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.stock_shortage_justification_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.stock_shortage_justification_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: stock_shortage_justification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.stock_shortage_justification_id_seq OWNED BY public.stock_shortage_justification.id;


-- --
-- -- Name: stock_shortage_reasons; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.stock_shortage_reasons (
--     id integer NOT NULL,
--     day_id integer NOT NULL,
--     product_id integer NOT NULL,
--     shortage_qty numeric(10,2) NOT NULL,
--     reason text NOT NULL,
--     entered_by integer,
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
--     updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
-- );


-- ALTER TABLE public.stock_shortage_reasons OWNER TO tamishshrivastava;

-- --
-- -- Name: stock_shortage_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.stock_shortage_reasons_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.stock_shortage_reasons_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: stock_shortage_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.stock_shortage_reasons_id_seq OWNED BY public.stock_shortage_reasons.id;


-- --
-- -- Name: users; Type: TABLE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE TABLE public.users (
--     id integer NOT NULL,
--     username character varying(50) NOT NULL,
--     password_hash text NOT NULL,
--     role character varying(20) NOT NULL,
--     created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
--     is_active boolean DEFAULT true
-- );


-- ALTER TABLE public.users OWNER TO tamishshrivastava;

-- --
-- -- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE SEQUENCE public.users_id_seq
--     AS integer
--     START WITH 1
--     INCREMENT BY 1
--     NO MINVALUE
--     NO MAXVALUE
--     CACHE 1;


-- ALTER TABLE public.users_id_seq OWNER TO tamishshrivastava;

-- --
-- -- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


-- --
-- -- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


-- --
-- -- Name: customer_daily_balance id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_daily_balance ALTER COLUMN id SET DEFAULT nextval('public.customer_daily_balance_id_seq'::regclass);


-- --
-- -- Name: customer_product_prices id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_product_prices ALTER COLUMN id SET DEFAULT nextval('public.customer_product_prices_id_seq'::regclass);


-- --
-- -- Name: customers id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


-- --
-- -- Name: daily_product_stock id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock ALTER COLUMN id SET DEFAULT nextval('public.daily_product_stock_id_seq'::regclass);


-- --
-- -- Name: day_status id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.day_status ALTER COLUMN id SET DEFAULT nextval('public.day_status_id_seq'::regclass);


-- --
-- -- Name: invoices id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


-- --
-- -- Name: ledger_events id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.ledger_events ALTER COLUMN id SET DEFAULT nextval('public.ledger_events_id_seq'::regclass);


-- --
-- -- Name: payments id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


-- --
-- -- Name: products id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


-- --
-- -- Name: sales id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


-- --
-- -- Name: stock_shortage_justification id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_justification ALTER COLUMN id SET DEFAULT nextval('public.stock_shortage_justification_id_seq'::regclass);


-- --
-- -- Name: stock_shortage_reasons id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_reasons ALTER COLUMN id SET DEFAULT nextval('public.stock_shortage_reasons_id_seq'::regclass);


-- --
-- -- Name: users id; Type: DEFAULT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


-- --
-- -- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.audit_logs
--     ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


-- --
-- -- Name: customer_daily_balance customer_daily_balance_business_date_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_daily_balance
--     ADD CONSTRAINT customer_daily_balance_business_date_customer_id_key UNIQUE (business_date, customer_id);


-- --
-- -- Name: customer_daily_balance customer_daily_balance_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_daily_balance
--     ADD CONSTRAINT customer_daily_balance_pkey PRIMARY KEY (id);


-- --
-- -- Name: customer_product_prices customer_product_prices_customer_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_product_prices
--     ADD CONSTRAINT customer_product_prices_customer_id_product_id_key UNIQUE (customer_id, product_id);


-- --
-- -- Name: customer_product_prices customer_product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_product_prices
--     ADD CONSTRAINT customer_product_prices_pkey PRIMARY KEY (id);


-- --
-- -- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customers
--     ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


-- --
-- -- Name: daily_product_stock daily_product_stock_day_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock
--     ADD CONSTRAINT daily_product_stock_day_id_product_id_key UNIQUE (day_id, product_id);


-- --
-- -- Name: daily_product_stock daily_product_stock_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock
--     ADD CONSTRAINT daily_product_stock_pkey PRIMARY KEY (id);


-- --
-- -- Name: day_status day_status_business_date_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.day_status
--     ADD CONSTRAINT day_status_business_date_key UNIQUE (business_date);


-- --
-- -- Name: day_status day_status_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.day_status
--     ADD CONSTRAINT day_status_pkey PRIMARY KEY (id);


-- --
-- -- Name: invoices invoices_invoice_id_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.invoices
--     ADD CONSTRAINT invoices_invoice_id_key UNIQUE (invoice_id);


-- --
-- -- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.invoices
--     ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


-- --
-- -- Name: ledger_events ledger_events_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.ledger_events
--     ADD CONSTRAINT ledger_events_pkey PRIMARY KEY (id);


-- --
-- -- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.payments
--     ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


-- --
-- -- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.products
--     ADD CONSTRAINT products_pkey PRIMARY KEY (id);


-- --
-- -- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.sales
--     ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


-- --
-- -- Name: stock_shortage_justification stock_shortage_justification_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_justification
--     ADD CONSTRAINT stock_shortage_justification_pkey PRIMARY KEY (id);


-- --
-- -- Name: stock_shortage_reasons stock_shortage_reasons_day_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_reasons
--     ADD CONSTRAINT stock_shortage_reasons_day_id_product_id_key UNIQUE (day_id, product_id);


-- --
-- -- Name: stock_shortage_reasons stock_shortage_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_reasons
--     ADD CONSTRAINT stock_shortage_reasons_pkey PRIMARY KEY (id);


-- --
-- -- Name: stock_shortage_justification uniq_day_product_shortage; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_justification
--     ADD CONSTRAINT uniq_day_product_shortage UNIQUE (day_id, product_id);


-- --
-- -- Name: daily_product_stock unique_day_product; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock
--     ADD CONSTRAINT unique_day_product UNIQUE (day_id, product_id);


-- --
-- -- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.users
--     ADD CONSTRAINT users_pkey PRIMARY KEY (id);


-- --
-- -- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.users
--     ADD CONSTRAINT users_username_key UNIQUE (username);


-- --
-- -- Name: idx_ledger_events_customer; Type: INDEX; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE INDEX idx_ledger_events_customer ON public.ledger_events USING btree (customer_id);


-- --
-- -- Name: idx_ledger_events_day; Type: INDEX; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE INDEX idx_ledger_events_day ON public.ledger_events USING btree (day_id);


-- --
-- -- Name: idx_ledger_events_product; Type: INDEX; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE INDEX idx_ledger_events_product ON public.ledger_events USING btree (product_id);


-- --
-- -- Name: idx_ledger_events_type; Type: INDEX; Schema: public; Owner: tamishshrivastava
-- --

-- CREATE INDEX idx_ledger_events_type ON public.ledger_events USING btree (event_type);


-- --
-- -- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.audit_logs
--     ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


-- --
-- -- Name: customer_daily_balance customer_daily_balance_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.customer_daily_balance
--     ADD CONSTRAINT customer_daily_balance_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


-- --
-- -- Name: daily_product_stock daily_product_stock_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock
--     ADD CONSTRAINT daily_product_stock_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.day_status(id) ON DELETE CASCADE;


-- --
-- -- Name: daily_product_stock daily_product_stock_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock
--     ADD CONSTRAINT daily_product_stock_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.users(id) ON DELETE SET NULL;


-- --
-- -- Name: daily_product_stock daily_product_stock_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.daily_product_stock
--     ADD CONSTRAINT daily_product_stock_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


-- --
-- -- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.invoices
--     ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


-- --
-- -- Name: invoices invoices_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.invoices
--     ADD CONSTRAINT invoices_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.day_status(id);


-- --
-- -- Name: ledger_events ledger_events_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.ledger_events
--     ADD CONSTRAINT ledger_events_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- --
-- -- Name: ledger_events ledger_events_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.ledger_events
--     ADD CONSTRAINT ledger_events_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.day_status(id) ON DELETE RESTRICT;


-- --
-- -- Name: ledger_events ledger_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.ledger_events
--     ADD CONSTRAINT ledger_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


-- --
-- -- Name: stock_shortage_justification stock_shortage_justification_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_justification
--     ADD CONSTRAINT stock_shortage_justification_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.day_status(id) ON DELETE CASCADE;


-- --
-- -- Name: stock_shortage_justification stock_shortage_justification_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_justification
--     ADD CONSTRAINT stock_shortage_justification_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.users(id);


-- --
-- -- Name: stock_shortage_justification stock_shortage_justification_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_justification
--     ADD CONSTRAINT stock_shortage_justification_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


-- --
-- -- Name: stock_shortage_reasons stock_shortage_reasons_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_reasons
--     ADD CONSTRAINT stock_shortage_reasons_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.day_status(id);


-- --
-- -- Name: stock_shortage_reasons stock_shortage_reasons_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_reasons
--     ADD CONSTRAINT stock_shortage_reasons_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.users(id);


-- --
-- -- Name: stock_shortage_reasons stock_shortage_reasons_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: tamishshrivastava
-- --

-- ALTER TABLE ONLY public.stock_shortage_reasons
--     ADD CONSTRAINT stock_shortage_reasons_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


-- --
-- -- PostgreSQL database dump complete
-- --

-- \unrestrict cc64DHeXC62ft8O9IUbLUCkiXytXfR6mTcBkk2xxeORb7uV5bPs7xFTlXp7KnP0

