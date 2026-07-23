"""MetaTrader infrastructure package.

Only MT4Client and its adapters may talk to MetaTrader data sources.
Controllers and services must never import adapter internals directly.
"""