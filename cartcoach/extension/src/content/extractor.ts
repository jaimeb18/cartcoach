import type { ExtractedProduct } from "@shared/types";

interface SiteExtractor {
  productName: () => string | null;
  price: () => number | null;
  category: () => string;
}

const extractors: Record<string, SiteExtractor> = {
  "amazon.com": {
    productName: () =>
      document.querySelector<HTMLElement>(
        "#productTitle, .a-size-large.product-title-word-break, #title"
      )?.innerText?.trim() ??
      document.querySelector<HTMLElement>(".a-size-medium.a-color-base")?.innerText?.trim() ??
      null,
    price: () => {
      const selectors = [
        ".a-price .a-offscreen",
        "#price_inside_buybox",
        "#priceblock_ourprice",
        ".a-price-whole",
      ];
      for (const sel of selectors) {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) {
          const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
          if (!isNaN(num)) return num;
        }
      }
      return null;
    },
    category: () => {
      const breadcrumb = document.querySelector<HTMLElement>(
        "#wayfinding-breadcrumbs_feature_div .a-list-item"
      );
      return breadcrumb?.innerText?.trim() ?? "Other";
    },
  },

  "target.com": {
    productName: () =>
      document.querySelector<HTMLElement>(
        '[data-test="product-title"], h1[class*="ProductTitle"]'
      )?.innerText?.trim() ?? null,
    price: () => {
      const el = document.querySelector<HTMLElement>(
        '[data-test="product-price"], [class*="PriceFontSize"]'
      );
      if (el) {
        const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) return num;
      }
      return null;
    },
    category: () => "Other",
  },

  "sephora.com": {
    productName: () =>
      document.querySelector<HTMLElement>(
        '[data-comp="ProductDisplayName"] span, .css-1g2jq23'
      )?.innerText?.trim() ?? null,
    price: () => {
      const el = document.querySelector<HTMLElement>(
        '[data-comp="Price"] b, .css-18jtxpr'
      );
      if (el) {
        const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) return num;
      }
      return null;
    },
    category: () => "Beauty",
  },

  "bestbuy.com": {
    productName: () =>
      document.querySelector<HTMLElement>(
        ".sku-title h1, [class*='heading-5']"
      )?.innerText?.trim() ?? null,
    price: () => {
      const el = document.querySelector<HTMLElement>(
        ".priceView-customer-price span, [class*='priceView-hero']"
      );
      if (el) {
        const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) return num;
      }
      return null;
    },
    category: () => "Electronics",
  },

  "walmart.com": {
    productName: () =>
      document.querySelector<HTMLElement>(
        '[itemprop="name"], h1.prod-ProductTitle'
      )?.innerText?.trim() ?? null,
    price: () => {
      const el = document.querySelector<HTMLElement>(
        '[itemprop="price"], .price-characteristic'
      );
      if (el) {
        const val = el.getAttribute("content") || el.innerText;
        const num = parseFloat(val.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) return num;
      }
      return null;
    },
    category: () => "Other",
  },

  "etsy.com": {
    productName: () =>
      document.querySelector<HTMLElement>(
        "h1[class*='wt-text-body-03']"
      )?.innerText?.trim() ?? null,
    price: () => {
      const el = document.querySelector<HTMLElement>(
        "[class*='currency-value'], .wt-text-title-largest"
      );
      if (el) {
        const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) return num;
      }
      return null;
    },
    category: () => "Other",
  },

  // Demo page (local file or localhost)
  "localhost": {
    productName: () =>
      document.querySelector<HTMLElement>("#productTitle")?.innerText?.trim() ?? null,
    price: () => {
      const el = document.querySelector<HTMLElement>("#productPrice");
      if (el) {
        const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) return num;
      }
      return null;
    },
    category: () => "Fashion",
  },
};

export function extractProductInfo(site: string): Partial<ExtractedProduct> | null {
  const key = Object.keys(extractors).find((k) => site.includes(k));
  if (!key) return null;

  const ex = extractors[key];
  const productName = ex.productName();
  const price = ex.price();

  if (!productName || !price) return null;

  return {
    site: key,
    productName,
    price,
    category: ex.category(),
    timestamp: new Date().toISOString(),
  };
}

export function extractCartTotal(): number | null {
  // Generic cart total extraction
  const selectors = [
    '[class*="order-summary"] [class*="total"]',
    '[class*="cart-total"]',
    '[class*="checkout-total"]',
    "#order-summary",
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) {
      const num = parseFloat(el.innerText.replace(/[^0-9.]/g, ""));
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}
