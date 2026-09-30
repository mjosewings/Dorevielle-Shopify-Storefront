import { Router, type IRouter, type Request, type Response } from "express";
import {
  AddShopifyCartLinesBody,
  AddShopifyCartLinesParams,
  CreateShopifyCartBody,
  GetShopifyCartParams,
  ListShopifyProductsQueryParams,
  RemoveShopifyCartLineParams,
  UpdateShopifyCartLineBody,
  UpdateShopifyCartLineParams,
} from "@workspace/api-zod";
import { shopifyStorefrontRequest } from "../lib/shopifyStorefrontClient";

const router: IRouter = Router();

const PRODUCTS_QUERY = `#graphql
  query Products($first: Int!) {
    products(first: $first) {
      nodes {
        id
        title
        handle
        description
        featuredImage { url altText }
        priceRange { minVariantPrice { amount currencyCode } }
        variants(first: 20) {
          nodes {
            id
            title
            availableForSale
            price { amount currencyCode }
          }
        }
      }
    }
  }
`;

const CART_FIELDS = `#graphql
  fragment CartFields on Cart {
    id
    checkoutUrl
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) {
      nodes {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            product {
              title
              featuredImage { url altText }
            }
          }
        }
      }
    }
  }
`;

const CART_QUERY = `#graphql
  query Cart($cartId: ID!) {
    cart(id: $cartId) { ...CartFields }
  }
  ${CART_FIELDS}
`;

const CART_CREATE_MUTATION = `#graphql
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

const CART_LINES_ADD_MUTATION = `#graphql
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

const CART_LINES_UPDATE_MUTATION = `#graphql
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

const CART_LINES_REMOVE_MUTATION = `#graphql
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFields }
      userErrors { field message }
    }
  }
  ${CART_FIELDS}
`;

type ShopifyMoney = { amount: string; currencyCode: string };
type ShopifyImage = { url: string; altText: string | null } | null;
type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  description: string;
  featuredImage: ShopifyImage;
  priceRange: { minVariantPrice: ShopifyMoney };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      price: ShopifyMoney;
    }>;
  };
};

type ShopifyCartNode = {
  id: string;
  checkoutUrl: string;
  cost: { subtotalAmount: ShopifyMoney };
  lines: {
    nodes: Array<{
      id: string;
      quantity: number;
      merchandise: {
        id: string;
        title: string;
        price: ShopifyMoney;
        product: { title: string; featuredImage: ShopifyImage };
      };
    }>;
  };
};

type ShopifyUserError = { field?: string[]; message: string };

class ShopifyCartValidationError extends Error {}

router.get("/shopify/products", async (req, res) => {
  const parsed = ListShopifyProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product query." });
    return;
  }

  try {
    const data = await shopifyStorefrontRequest<{
      products: { nodes: ShopifyProductNode[] };
    }>(PRODUCTS_QUERY, { first: parsed.data.first ?? 12 });

    res.json(
      data.products.nodes.map((product) => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        image: product.featuredImage,
        price: Number(product.priceRange.minVariantPrice.amount),
        currencyCode: product.priceRange.minVariantPrice.currencyCode,
        variants: product.variants.nodes.map((variant) => ({
          id: variant.id,
          title: variant.title,
          price: Number(variant.price.amount),
          currencyCode: variant.price.currencyCode,
          availableForSale: variant.availableForSale,
        })),
      })),
    );
  } catch (error) {
    req.log.error({ err: error }, "Shopify product query failed");
    res.status(502).json({ error: "Unable to load the Dorévielle edit." });
  }
});

router.post("/shopify/cart", async (req, res) => {
  const parsed = CreateShopifyCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Add at least one valid product to the bag." });
    return;
  }

  try {
    const data = await shopifyStorefrontRequest<{
      cartCreate: { cart: ShopifyCartNode | null; userErrors: ShopifyUserError[] };
    }>(CART_CREATE_MUTATION, { lines: parsed.data.lines });
    res
      .status(201)
      .json(
        parseMutationCart(data.cartCreate.cart, data.cartCreate.userErrors, {
          requireAddedLine: true,
        }),
      );
  } catch (error) {
    handleShopifyError(req, res, error);
  }
});

router.get("/shopify/cart/:cartId", async (req, res) => {
  const parsed = GetShopifyCartParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid cart." });
    return;
  }

  try {
    const data = await shopifyStorefrontRequest<{ cart: ShopifyCartNode | null }>(
      CART_QUERY,
      { cartId: parsed.data.cartId },
    );
    if (!data.cart) {
      res.status(404).json({ error: "Cart not found." });
      return;
    }
    res.json(normalizeCart(data.cart));
  } catch (error) {
    handleShopifyError(req, res, error);
  }
});

router.post("/shopify/cart/:cartId/lines", async (req, res) => {
  const params = AddShopifyCartLinesParams.safeParse(req.params);
  const body = AddShopifyCartLinesBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid cart line." });
    return;
  }

  try {
    const data = await shopifyStorefrontRequest<{
      cartLinesAdd: { cart: ShopifyCartNode | null; userErrors: ShopifyUserError[] };
    }>(CART_LINES_ADD_MUTATION, { cartId: params.data.cartId, lines: body.data.lines });
    res.json(
      parseMutationCart(data.cartLinesAdd.cart, data.cartLinesAdd.userErrors, {
        requireAddedLine: true,
      }),
    );
  } catch (error) {
    handleShopifyError(req, res, error);
  }
});

router.patch("/shopify/cart/:cartId/lines/:lineId", async (req, res) => {
  const params = UpdateShopifyCartLineParams.safeParse(req.params);
  const body = UpdateShopifyCartLineBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid cart line quantity." });
    return;
  }

  try {
    const data = await shopifyStorefrontRequest<{
      cartLinesUpdate: { cart: ShopifyCartNode | null; userErrors: ShopifyUserError[] };
    }>(CART_LINES_UPDATE_MUTATION, {
      cartId: params.data.cartId,
      lines: [{ id: params.data.lineId, quantity: body.data.quantity }],
    });
    res.json(parseMutationCart(data.cartLinesUpdate.cart, data.cartLinesUpdate.userErrors));
  } catch (error) {
    handleShopifyError(req, res, error);
  }
});

router.delete("/shopify/cart/:cartId/lines/:lineId", async (req, res) => {
  const params = RemoveShopifyCartLineParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid cart line." });
    return;
  }

  try {
    const data = await shopifyStorefrontRequest<{
      cartLinesRemove: { cart: ShopifyCartNode | null; userErrors: ShopifyUserError[] };
    }>(CART_LINES_REMOVE_MUTATION, {
      cartId: params.data.cartId,
      lineIds: [params.data.lineId],
    });
    res.json(parseMutationCart(data.cartLinesRemove.cart, data.cartLinesRemove.userErrors));
  } catch (error) {
    handleShopifyError(req, res, error);
  }
});

function parseMutationCart(
  cart: ShopifyCartNode | null,
  userErrors: ShopifyUserError[],
  options: { requireAddedLine?: boolean } = {},
) {
  if (userErrors.length) {
    throw new ShopifyCartValidationError(
      userErrors.map((error) => error.message).join(", "),
    );
  }
  if (!cart) {
    throw new Error("Shopify did not return a cart.");
  }
  const normalizedCart = normalizeCart(cart);
  if (options.requireAddedLine && normalizedCart.lines.length === 0) {
    throw new ShopifyCartValidationError(
      "That item is currently unavailable for sale.",
    );
  }
  return normalizedCart;
}

function normalizeCart(cart: ShopifyCartNode) {
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    lines: cart.lines.nodes
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        id: line.id,
        quantity: line.quantity,
        merchandiseId: line.merchandise.id,
        title: line.merchandise.product.title,
        variantTitle: line.merchandise.title,
        price: Number(line.merchandise.price.amount),
        currencyCode: line.merchandise.price.currencyCode,
        image: line.merchandise.product.featuredImage,
      })),
    subtotal: Number(cart.cost.subtotalAmount.amount),
    currencyCode: cart.cost.subtotalAmount.currencyCode,
  };
}

function handleShopifyError(
  req: Request,
  res: Response,
  error: unknown,
) {
  req.log.error({ err: error }, "Shopify cart operation failed");
  const message =
    error instanceof Error ? error.message : "Shopify cart operation failed.";
  const status = error instanceof ShopifyCartValidationError ? 400 : 502;
  res.status(status).json({ error: message });
}

export default router;