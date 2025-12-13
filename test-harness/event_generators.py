"""
Event Generators for Test Harness
Generates realistic event data for different event types
"""

import random
import uuid
from datetime import datetime, timedelta
from typing import Any
from faker import Faker

fake = Faker()


class ProductCatalog:
    """Simulated product catalog for generating realistic product data"""
    
    def __init__(self, count: int = 50, price_range: dict = None, categories: list = None):
        self.categories = categories or [
            "Electronics", "Clothing", "Home & Garden", "Sports", "Books", "Toys"
        ]
        price_range = price_range or {"min": 9.99, "max": 499.99}
        
        self.products = []
        for i in range(count):
            self.products.append({
                "product_id": f"prod_{i+1:04d}",
                "name": fake.catch_phrase(),
                "price": round(random.uniform(price_range["min"], price_range["max"]), 2),
                "category": random.choice(self.categories),
                "sku": fake.bothify(text="???-####"),
            })
    
    def random_product(self) -> dict:
        return random.choice(self.products)
    
    def random_products(self, count: int) -> list:
        return random.sample(self.products, min(count, len(self.products)))


class UserSession:
    """Represents a user session for generating correlated events"""
    
    def __init__(self, user_id: str, product_catalog: ProductCatalog):
        self.user_id = user_id
        self.session_id = str(uuid.uuid4())
        self.product_catalog = product_catalog
        self.cart_items = []
        self.viewed_products = []
        self.search_queries = []
        self.started_at = datetime.utcnow()
    
    def add_to_cart(self, product: dict = None) -> dict:
        """Add a product to cart"""
        product = product or self.product_catalog.random_product()
        quantity = random.randint(1, 3)
        self.cart_items.append({"product": product, "quantity": quantity})
        return {
            "product_id": product["product_id"],
            "product_name": product["name"],
            "quantity": quantity,
            "price": product["price"],
            "currency": "USD",
            "category": product["category"],
        }
    
    def remove_from_cart(self) -> dict | None:
        """Remove a random item from cart"""
        if not self.cart_items:
            return None
        item = random.choice(self.cart_items)
        self.cart_items.remove(item)
        return {
            "product_id": item["product"]["product_id"],
            "quantity": item["quantity"],
        }
    
    def get_cart_value(self) -> float:
        """Calculate total cart value"""
        return sum(item["product"]["price"] * item["quantity"] for item in self.cart_items)


class EventGenerator:
    """Main event generator class"""
    
    def __init__(self, config: dict):
        self.config = config
        self.product_catalog = ProductCatalog(
            count=config.get("products", {}).get("count", 50),
            price_range=config.get("products", {}).get("price_range"),
            categories=config.get("products", {}).get("categories"),
        )
        self.pages = config.get("pages", {}).get("types", [])
        self.user_sessions: dict[str, UserSession] = {}
        
        # Search queries for page.search events
        self.search_queries = [
            "laptop", "shoes", "headphones", "jacket", "watch", "camera",
            "phone case", "keyboard", "monitor", "backpack", "sunglasses",
            "running shoes", "wireless earbuds", "gaming mouse", "yoga mat",
        ]
    
    def get_or_create_session(self, user_id: str) -> UserSession:
        """Get existing session or create new one"""
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = UserSession(user_id, self.product_catalog)
        return self.user_sessions[user_id]
    
    def generate_event(self, event_type: str, user_id: str) -> dict:
        """Generate an event of the specified type"""
        session = self.get_or_create_session(user_id)
        
        generators = {
            "cart_add": self._generate_cart_add,
            "cart_remove": self._generate_cart_remove,
            "cart_update": self._generate_cart_update,
            "cart_checkout": self._generate_cart_checkout,
            "page_view": self._generate_page_view,
            "page_click": self._generate_page_click,
            "page_search": self._generate_page_search,
            "order_created": self._generate_order_created,
            "order_updated": self._generate_order_updated,
            "order_fulfilled": self._generate_order_fulfilled,
            "user_signup": self._generate_user_signup,
            "user_login": self._generate_user_login,
        }
        
        generator = generators.get(event_type)
        if not generator:
            raise ValueError(f"Unknown event type: {event_type}")
        
        return generator(session)
    
    def _generate_cart_add(self, session: UserSession) -> dict:
        """Generate cart.add event"""
        cart_data = session.add_to_cart()
        return {
            "topic": "cart_events",
            "event_type": "cart.add",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                **cart_data,
            }
        }
    
    def _generate_cart_remove(self, session: UserSession) -> dict:
        """Generate cart.remove event"""
        remove_data = session.remove_from_cart()
        if not remove_data:
            # If cart is empty, add something first then remove
            session.add_to_cart()
            remove_data = session.remove_from_cart()
        
        return {
            "topic": "cart_events",
            "event_type": "cart.remove",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                **remove_data,
            }
        }
    
    def _generate_cart_update(self, session: UserSession) -> dict:
        """Generate cart.update event"""
        if not session.cart_items:
            session.add_to_cart()
        
        item = random.choice(session.cart_items)
        old_qty = item["quantity"]
        new_qty = random.randint(1, 5)
        item["quantity"] = new_qty
        
        return {
            "topic": "cart_events",
            "event_type": "cart.update",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                "product_id": item["product"]["product_id"],
                "old_quantity": old_qty,
                "new_quantity": new_qty,
            }
        }
    
    def _generate_cart_checkout(self, session: UserSession) -> dict:
        """Generate cart.checkout event"""
        # Ensure cart has items
        if not session.cart_items:
            session.add_to_cart()
            session.add_to_cart()
        
        cart_total = session.get_cart_value()
        item_count = sum(item["quantity"] for item in session.cart_items)
        
        return {
            "topic": "cart_events",
            "event_type": "cart.checkout",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                "cart_total": round(cart_total, 2),
                "item_count": item_count,
                "currency": "USD",
            }
        }
    
    def _generate_page_view(self, session: UserSession) -> dict:
        """Generate page.view event"""
        # Select page type based on weights
        page_weights = [(p["name"], p.get("weight", 10)) for p in self.pages]
        page_type = random.choices(
            [p[0] for p in page_weights],
            weights=[p[1] for p in page_weights],
            k=1
        )[0] if page_weights else "home"
        
        # Generate appropriate URL
        if page_type == "product":
            product = self.product_catalog.random_product()
            page_url = f"/product/{product['product_id']}"
            product_id = product["product_id"]
            session.viewed_products.append(product)
        elif page_type == "category":
            category = random.choice(self.product_catalog.categories)
            page_url = f"/category/{category.lower().replace(' ', '-')}"
            product_id = None
        elif page_type == "search":
            query = random.choice(self.search_queries)
            page_url = f"/search?q={query}"
            product_id = None
        else:
            page_url = f"/{page_type}" if page_type != "home" else "/"
            product_id = None
        
        return {
            "topic": "page_events",
            "event_type": "page.view",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                "page_url": page_url,
                "page_title": f"{page_type.title()} Page",
                "page_type": page_type,
                "referrer": random.choice(["", "https://google.com", "https://facebook.com", ""]),
                "product_id": product_id,
            }
        }
    
    def _generate_page_click(self, session: UserSession) -> dict:
        """Generate page.click event"""
        element_types = ["button", "link", "image", "card", "nav"]
        element_ids = ["add-to-cart", "buy-now", "view-details", "nav-home", "filter-btn"]
        
        return {
            "topic": "page_events",
            "event_type": "page.click",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                "element_id": random.choice(element_ids),
                "element_type": random.choice(element_types),
                "page_url": random.choice(["/", "/product/prod_0001", "/category/electronics"]),
            }
        }
    
    def _generate_page_search(self, session: UserSession) -> dict:
        """Generate page.search event"""
        query = random.choice(self.search_queries)
        session.search_queries.append(query)
        
        return {
            "topic": "page_events",
            "event_type": "page.search",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                "search_query": query,
                "results_count": random.randint(0, 150),
            }
        }
    
    def _generate_order_created(self, session: UserSession) -> dict:
        """Generate order.created event"""
        # Ensure cart has items
        if not session.cart_items:
            session.add_to_cart()
            session.add_to_cart()
        
        order_total = session.get_cart_value()
        item_count = sum(item["quantity"] for item in session.cart_items)
        
        order_id = f"ORD-{fake.bothify(text='######')}"
        
        # Clear cart after order
        order_items = session.cart_items.copy()
        session.cart_items = []
        
        return {
            "topic": "order_events",
            "event_type": "order.created",
            "data": {
                "user_id": session.user_id,
                "order_id": order_id,
                "total_amount": round(order_total, 2),
                "currency": "USD",
                "status": "pending",
                "item_count": item_count,
                "payment_method": random.choice(["credit_card", "paypal", "apple_pay"]),
            }
        }
    
    def _generate_order_updated(self, session: UserSession) -> dict:
        """Generate order.updated event"""
        order_id = f"ORD-{fake.bothify(text='######')}"
        
        return {
            "topic": "order_events",
            "event_type": "order.updated",
            "data": {
                "user_id": session.user_id,
                "order_id": order_id,
                "old_status": "pending",
                "new_status": random.choice(["processing", "shipped", "out_for_delivery"]),
            }
        }
    
    def _generate_order_fulfilled(self, session: UserSession) -> dict:
        """Generate order.fulfilled event"""
        order_id = f"ORD-{fake.bothify(text='######')}"
        
        return {
            "topic": "order_events",
            "event_type": "order.fulfilled",
            "data": {
                "user_id": session.user_id,
                "order_id": order_id,
                "status": "delivered",
                "delivered_at": datetime.utcnow().isoformat(),
            }
        }
    
    def _generate_user_signup(self, session: UserSession) -> dict:
        """Generate user.signup event"""
        return {
            "topic": "user_events",
            "event_type": "user.signup",
            "data": {
                "user_id": session.user_id,
                "email": fake.email(),
                "signup_source": random.choice(["organic", "google_ads", "facebook", "referral"]),
            }
        }
    
    def _generate_user_login(self, session: UserSession) -> dict:
        """Generate user.login event"""
        return {
            "topic": "user_events",
            "event_type": "user.login",
            "data": {
                "user_id": session.user_id,
                "session_id": session.session_id,
                "login_method": random.choice(["password", "google", "facebook", "magic_link"]),
                "device_type": random.choice(["desktop", "mobile", "tablet"]),
            }
        }
    
    def select_event_type(self, weights: dict) -> str:
        """Select an event type based on configured weights"""
        event_types = list(weights.keys())
        type_weights = list(weights.values())
        
        # Normalize internal event type names
        type_mapping = {
            "cart_add": "cart_add",
            "cart_remove": "cart_remove",
            "cart_update": "cart_update",
            "cart_checkout": "cart_checkout",
            "page_view": "page_view",
            "page_click": "page_click",
            "page_search": "page_search",
            "order_created": "order_created",
            "order_updated": "order_updated",
            "order_fulfilled": "order_fulfilled",
            "user_signup": "user_signup",
            "user_login": "user_login",
        }
        
        selected = random.choices(event_types, weights=type_weights, k=1)[0]
        return type_mapping.get(selected, selected)

