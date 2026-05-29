from django.urls import path
from . import views

urlpatterns = [
    path('plans/', views.PlanListView.as_view(), name='plan-list'),
    path('workspaces/<uuid:workspace_id>/subscription/', views.SubscriptionView.as_view(), name='subscription-detail'),
    path('workspaces/<uuid:workspace_id>/invoices/', views.InvoiceListView.as_view(), name='invoice-list'),
    path('workspaces/<uuid:workspace_id>/checkout/', views.CreateCheckoutSessionView.as_view(), name='checkout-session'),
    path('webhook/', views.DodoWebhookView.as_view(), name='dodo-webhook'),
]
