export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      attribute_definitions: {
        Row: {
          admin_group: string | null
          created_at: string
          id: string
          is_filterable: boolean
          is_seo_visible: boolean
          key: string
          label: string
          scope: string
          status: string
          unit: string | null
          updated_at: string
          validation_note: string | null
          value_type: string
        }
        Insert: {
          admin_group?: string | null
          created_at?: string
          id?: string
          is_filterable?: boolean
          is_seo_visible?: boolean
          key: string
          label: string
          scope?: string
          status?: string
          unit?: string | null
          updated_at?: string
          validation_note?: string | null
          value_type: string
        }
        Update: {
          admin_group?: string | null
          created_at?: string
          id?: string
          is_filterable?: boolean
          is_seo_visible?: boolean
          key?: string
          label?: string
          scope?: string
          status?: string
          unit?: string | null
          updated_at?: string
          validation_note?: string | null
          value_type?: string
        }
        Relationships: []
      }
      attribute_options: {
        Row: {
          attribute_definition_id: string
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          attribute_definition_id: string
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attribute_definition_id?: string
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_options_attribute_definition_id_fkey"
            columns: ["attribute_definition_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          safe_metadata_json: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          safe_metadata_json?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          safe_metadata_json?: Json
        }
        Relationships: []
      }
      brand_collections: {
        Row: {
          brand_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          name_normalized: string | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_normalized?: string | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_normalized?: string | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_collections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_lines: {
        Row: {
          brand_collection_id: string
          brand_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          name_normalized: string | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          brand_collection_id: string
          brand_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_normalized?: string | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          brand_collection_id?: string
          brand_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_normalized?: string | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_lines_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_lines_collection_brand_fk"
            columns: ["brand_collection_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "brand_collections"
            referencedColumns: ["id", "brand_id"]
          },
        ]
      }
      brands: {
        Row: {
          country_code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          name_normalized: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          name_normalized?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          name_normalized?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      case_shapes: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_offers: {
        Row: {
          condition: string
          created_at: string
          currency_code: string | null
          current_price_minor: number | null
          delivery_estimate_id: string | null
          id: string
          inventory_state_id: string | null
          is_visible: boolean
          offer_kind: string
          previous_price_minor: number | null
          purchase_limit: number | null
          seller_note: string | null
          sku: string | null
          status: string
          updated_at: string
          watch_reference_id: string
        }
        Insert: {
          condition?: string
          created_at?: string
          currency_code?: string | null
          current_price_minor?: number | null
          delivery_estimate_id?: string | null
          id?: string
          inventory_state_id?: string | null
          is_visible?: boolean
          offer_kind?: string
          previous_price_minor?: number | null
          purchase_limit?: number | null
          seller_note?: string | null
          sku?: string | null
          status?: string
          updated_at?: string
          watch_reference_id: string
        }
        Update: {
          condition?: string
          created_at?: string
          currency_code?: string | null
          current_price_minor?: number | null
          delivery_estimate_id?: string | null
          id?: string
          inventory_state_id?: string | null
          is_visible?: boolean
          offer_kind?: string
          previous_price_minor?: number | null
          purchase_limit?: number | null
          seller_note?: string | null
          sku?: string | null
          status?: string
          updated_at?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_offers_delivery_estimate_id_fkey"
            columns: ["delivery_estimate_id"]
            isOneToOne: false
            referencedRelation: "delivery_estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_offers_inventory_state_id_fkey"
            columns: ["inventory_state_id"]
            isOneToOne: false
            referencedRelation: "inventory_states"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_offers_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_public_read_models: {
        Row: {
          brand_slug: string
          created_at: string
          read_model_json: Json
          reference_code_normalized: string
          reference_slug: string
          source_import_batch_id: string | null
          status: string
          updated_at: string
          watch_reference_id: string
        }
        Insert: {
          brand_slug: string
          created_at?: string
          read_model_json: Json
          reference_code_normalized: string
          reference_slug: string
          source_import_batch_id?: string | null
          status?: string
          updated_at?: string
          watch_reference_id: string
        }
        Update: {
          brand_slug?: string
          created_at?: string
          read_model_json?: Json
          reference_code_normalized?: string
          reference_slug?: string
          source_import_batch_id?: string | null
          status?: string
          updated_at?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_public_read_models_source_import_batch_id_fkey"
            columns: ["source_import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_public_read_models_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: true
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_search_documents: {
        Row: {
          search_text: string
          search_vector: unknown
          updated_at: string
          watch_reference_id: string
        }
        Insert: {
          search_text: string
          search_vector?: unknown
          updated_at?: string
          watch_reference_id: string
        }
        Update: {
          search_text?: string
          search_vector?: unknown
          updated_at?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_search_documents_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: true
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      clasp_types: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      colors: {
        Row: {
          code: string
          color_family: string
          created_at: string
          hex_value: string | null
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          color_family: string
          created_at?: string
          hex_value?: string | null
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          color_family?: string
          created_at?: string
          hex_value?: string | null
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      commerce_cart_items: {
        Row: {
          added_at: string
          brand_slug: string
          cart_id: string
          id: string
          quantity: number
          reference_code_normalized: string
          source: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          brand_slug: string
          cart_id: string
          id?: string
          quantity: number
          reference_code_normalized: string
          source?: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          brand_slug?: string
          cart_id?: string
          id?: string
          quantity?: number
          reference_code_normalized?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commerce_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "commerce_carts"
            referencedColumns: ["id"]
          },
        ]
      }
      commerce_carts: {
        Row: {
          created_at: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crystal_types: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_estimates: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          max_days: number | null
          min_days: number | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          max_days?: number | null
          min_days?: number | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          max_days?: number | null
          min_days?: number | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          mapping_json: Json
          source_filename: string
          source_kind: string
          status: string
          summary_json: Json
          uploaded_by: string | null
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          mapping_json?: Json
          source_filename: string
          source_kind: string
          status?: string
          summary_json?: Json
          uploaded_by?: string | null
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          mapping_json?: Json
          source_filename?: string
          source_kind?: string
          status?: string
          summary_json?: Json
          uploaded_by?: string | null
        }
        Relationships: []
      }
      import_rows: {
        Row: {
          created_at: string
          errors_json: Json
          id: string
          import_batch_id: string
          normalized_json: Json
          raw_json: Json
          row_number: number
          status: string
          warnings_json: Json
        }
        Insert: {
          created_at?: string
          errors_json?: Json
          id?: string
          import_batch_id: string
          normalized_json?: Json
          raw_json?: Json
          row_number: number
          status: string
          warnings_json?: Json
        }
        Update: {
          created_at?: string
          errors_json?: Json
          id?: string
          import_batch_id?: string
          normalized_json?: Json
          raw_json?: Json
          row_number?: number
          status?: string
          warnings_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_events: {
        Row: {
          catalog_offer_id: string
          changed_at: string
          changed_by: string | null
          id: string
          inventory_state_id: string
          quantity_available: number | null
          source: string
        }
        Insert: {
          catalog_offer_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          inventory_state_id: string
          quantity_available?: number | null
          source?: string
        }
        Update: {
          catalog_offer_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          inventory_state_id?: string
          quantity_available?: number | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_events_catalog_offer_id_fkey"
            columns: ["catalog_offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_events_inventory_state_id_fkey"
            columns: ["inventory_state_id"]
            isOneToOne: false
            referencedRelation: "inventory_states"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_states: {
        Row: {
          code: string
          created_at: string
          id: string
          is_orderable: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_orderable?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_orderable?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          material_family: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          material_family?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          material_family?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      movement_types: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      movements: {
        Row: {
          caliber_code: string | null
          created_at: string
          display_name: string
          frequency_vph: number | null
          id: string
          jewels: number | null
          manufacturer: string | null
          movement_type_id: string | null
          power_reserve_hours: number | null
          updated_at: string
        }
        Insert: {
          caliber_code?: string | null
          created_at?: string
          display_name: string
          frequency_vph?: number | null
          id?: string
          jewels?: number | null
          manufacturer?: string | null
          movement_type_id?: string | null
          power_reserve_hours?: number | null
          updated_at?: string
        }
        Update: {
          caliber_code?: string | null
          created_at?: string
          display_name?: string
          frequency_vph?: number | null
          id?: string
          jewels?: number | null
          manufacturer?: string | null
          movement_type_id?: string | null
          power_reserve_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_movement_type_id_fkey"
            columns: ["movement_type_id"]
            isOneToOne: false
            referencedRelation: "movement_types"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_price_history: {
        Row: {
          catalog_offer_id: string
          changed_by: string | null
          created_at: string
          currency_code: string
          id: string
          price_minor: number
          reason: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          catalog_offer_id: string
          changed_by?: string | null
          created_at?: string
          currency_code: string
          id?: string
          price_minor: number
          reason?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          catalog_offer_id?: string
          changed_by?: string | null
          created_at?: string
          currency_code?: string
          id?: string
          price_minor?: number
          reason?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_price_history_catalog_offer_id_fkey"
            columns: ["catalog_offer_id"]
            isOneToOne: false
            referencedRelation: "catalog_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          customer_visible: boolean
          event_type: string
          id: string
          message: string
          next_payment_status: string | null
          next_status: string | null
          order_id: string
          previous_payment_status: string | null
          previous_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          customer_visible?: boolean
          event_type: string
          id?: string
          message: string
          next_payment_status?: string | null
          next_status?: string | null
          order_id: string
          previous_payment_status?: string | null
          previous_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          customer_visible?: boolean
          event_type?: string
          id?: string
          message?: string
          next_payment_status?: string | null
          next_status?: string | null
          order_id?: string
          previous_payment_status?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          brand_name_snapshot: string
          brand_slug: string
          canonical_href_snapshot: string
          created_at: string
          display_name_snapshot: string
          id: string
          image_snapshot: Json | null
          line_total_minor: number
          order_id: string
          quantity: number
          reference_code_normalized: string
          reference_display_snapshot: string
          unit_price_minor: number
        }
        Insert: {
          brand_name_snapshot: string
          brand_slug: string
          canonical_href_snapshot: string
          created_at?: string
          display_name_snapshot: string
          id?: string
          image_snapshot?: Json | null
          line_total_minor: number
          order_id: string
          quantity: number
          reference_code_normalized: string
          reference_display_snapshot: string
          unit_price_minor: number
        }
        Update: {
          brand_name_snapshot?: string
          brand_slug?: string
          canonical_href_snapshot?: string
          created_at?: string
          display_name_snapshot?: string
          id?: string
          image_snapshot?: Json | null
          line_total_minor?: number
          order_id?: string
          quantity?: number
          reference_code_normalized?: string
          reference_display_snapshot?: string
          unit_price_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipments: {
        Row: {
          carrier_actual_cost_minor: number | null
          carrier_currency: string
          carrier_name: string
          carrier_status_code: string | null
          carrier_status_name: string | null
          carrier_status_updated_at: string | null
          cdek_order_number: string | null
          cdek_order_uuid: string | null
          create_attempts: number
          created_at: string
          customer_delivery_charge_minor: number
          delivery_address: Json
          delivery_method: string
          id: string
          last_error_at: string | null
          last_error_code: string | null
          last_sync_at: string | null
          order_id: string
          pickup_point_address: string | null
          pickup_point_city: string | null
          pickup_point_code: string | null
          pickup_point_latitude: number | null
          pickup_point_longitude: number | null
          pickup_point_name: string | null
          pickup_point_postal_code: string | null
          provider: string
          raw_carrier_metadata: Json
          recipient_name: string
          recipient_phone: string
          safe_admin_note: string | null
          shipment_status: Database["public"]["Enums"]["order_shipment_status"]
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          carrier_actual_cost_minor?: number | null
          carrier_currency?: string
          carrier_name?: string
          carrier_status_code?: string | null
          carrier_status_name?: string | null
          carrier_status_updated_at?: string | null
          cdek_order_number?: string | null
          cdek_order_uuid?: string | null
          create_attempts?: number
          created_at?: string
          customer_delivery_charge_minor: number
          delivery_address?: Json
          delivery_method: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_sync_at?: string | null
          order_id: string
          pickup_point_address?: string | null
          pickup_point_city?: string | null
          pickup_point_code?: string | null
          pickup_point_latitude?: number | null
          pickup_point_longitude?: number | null
          pickup_point_name?: string | null
          pickup_point_postal_code?: string | null
          provider?: string
          raw_carrier_metadata?: Json
          recipient_name: string
          recipient_phone: string
          safe_admin_note?: string | null
          shipment_status?: Database["public"]["Enums"]["order_shipment_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          carrier_actual_cost_minor?: number | null
          carrier_currency?: string
          carrier_name?: string
          carrier_status_code?: string | null
          carrier_status_name?: string | null
          carrier_status_updated_at?: string | null
          cdek_order_number?: string | null
          cdek_order_uuid?: string | null
          create_attempts?: number
          created_at?: string
          customer_delivery_charge_minor?: number
          delivery_address?: Json
          delivery_method?: string
          id?: string
          last_error_at?: string | null
          last_error_code?: string | null
          last_sync_at?: string | null
          order_id?: string
          pickup_point_address?: string | null
          pickup_point_city?: string | null
          pickup_point_code?: string | null
          pickup_point_latitude?: number | null
          pickup_point_longitude?: number | null
          pickup_point_name?: string | null
          pickup_point_postal_code?: string | null
          provider?: string
          raw_carrier_metadata?: Json
          recipient_name?: string
          recipient_phone?: string
          safe_admin_note?: string | null
          shipment_status?: Database["public"]["Enums"]["order_shipment_status"]
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          cdek_pickup_point_address: string | null
          cdek_pickup_point_code: string | null
          cdek_pickup_point_city: string | null
          cdek_pickup_point_latitude: number | null
          cdek_pickup_point_longitude: number | null
          cdek_pickup_point_name: string | null
          cdek_pickup_point_postal_code: string | null
          cdek_destination_city_code: number | null
          checkout_submission_key: string
          completed_at: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          currency: string
          customer_comment: string | null
          delivery_amount_minor: number
          delivery_city: string
          delivery_comment: string | null
          delivery_house: string | null
          delivery_method: string
          delivery_postal_code: string | null
          delivery_provider: string
          delivery_quote_snapshot: Json
          delivery_street: string | null
          delivery_tariff_code: string | null
          delivery_unit: string | null
          id: string
          legal_consent_snapshot: Json
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["order_payment_status"]
          product_subtotal_minor: number
          source: Database["public"]["Enums"]["checkout_source"]
          status: Database["public"]["Enums"]["order_status"]
          total_amount_minor: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cdek_pickup_point_address?: string | null
          cdek_pickup_point_code?: string | null
          cdek_pickup_point_city?: string | null
          cdek_pickup_point_latitude?: number | null
          cdek_pickup_point_longitude?: number | null
          cdek_pickup_point_name?: string | null
          cdek_pickup_point_postal_code?: string | null
          cdek_destination_city_code?: number | null
          checkout_submission_key: string
          completed_at?: string | null
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at?: string
          currency?: string
          customer_comment?: string | null
          delivery_amount_minor: number
          delivery_city: string
          delivery_comment?: string | null
          delivery_house?: string | null
          delivery_method?: string
          delivery_postal_code?: string | null
          delivery_provider?: string
          delivery_quote_snapshot?: Json
          delivery_street?: string | null
          delivery_tariff_code?: string | null
          delivery_unit?: string | null
          id?: string
          legal_consent_snapshot?: Json
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          product_subtotal_minor: number
          source: Database["public"]["Enums"]["checkout_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total_amount_minor: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          cdek_pickup_point_address?: string | null
          cdek_pickup_point_code?: string | null
          cdek_pickup_point_city?: string | null
          cdek_pickup_point_latitude?: number | null
          cdek_pickup_point_longitude?: number | null
          cdek_pickup_point_name?: string | null
          cdek_pickup_point_postal_code?: string | null
          cdek_destination_city_code?: number | null
          checkout_submission_key?: string
          completed_at?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          currency?: string
          customer_comment?: string | null
          delivery_amount_minor?: number
          delivery_city?: string
          delivery_comment?: string | null
          delivery_house?: string
          delivery_method?: string
          delivery_postal_code?: string
          delivery_provider?: string
          delivery_quote_snapshot?: Json
          delivery_street?: string
          delivery_tariff_code?: string | null
          delivery_unit?: string | null
          id?: string
          legal_consent_snapshot?: Json
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["order_payment_status"]
          product_subtotal_minor?: number
          source?: Database["public"]["Enums"]["checkout_source"]
          status?: Database["public"]["Enums"]["order_status"]
          total_amount_minor?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          amount_minor: number
          canceled_at: string | null
          confirmation_url: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          order_id: string
          provider: string
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_attempt_status"]
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          canceled_at?: string | null
          confirmation_url?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          canceled_at?: string | null
          confirmation_url?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          provider?: string
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          succeeded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          order_id: string | null
          payment_attempt_id: string | null
          processed_at: string | null
          processing_result: string
          provider: string
          provider_object_id: string
          provider_status: string | null
          received_at: string
          refund_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          processed_at?: string | null
          processing_result?: string
          provider?: string
          provider_object_id: string
          provider_status?: string | null
          received_at?: string
          refund_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          order_id?: string | null
          payment_attempt_id?: string | null
          processed_at?: string | null
          processing_result?: string
          provider?: string
          provider_object_id?: string
          provider_status?: string | null
          received_at?: string
          refund_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "payment_refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          idempotency_key: string
          order_id: string
          payment_attempt_id: string
          provider_refund_id: string | null
          reason: string | null
          requested_by: string | null
          status: Database["public"]["Enums"]["payment_refund_status"]
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          order_id: string
          payment_attempt_id: string
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["payment_refund_status"]
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string
          payment_attempt_id?: string
          provider_refund_id?: string | null
          reason?: string | null
          requested_by?: string | null
          status?: Database["public"]["Enums"]["payment_refund_status"]
          succeeded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_refunds_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          locale: string
          phone: string | null
          preferred_contact: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          locale?: string
          phone?: string | null
          preferred_contact?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          locale?: string
          phone?: string | null
          preferred_contact?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provisional_watch_identities: {
        Row: {
          aggregate_count: number
          created_at: string
          display_label: string
          id: string
          last_seen_at: string
          normalized_brand_key: string | null
          normalized_model_key: string | null
          normalized_reference_key: string | null
          shared_traits_json: Json | null
          shared_traits_provenance_json: Json | null
          status: string
          updated_at: string
          watch_reference_id: string | null
        }
        Insert: {
          aggregate_count?: number
          created_at?: string
          display_label: string
          id?: string
          last_seen_at?: string
          normalized_brand_key?: string | null
          normalized_model_key?: string | null
          normalized_reference_key?: string | null
          shared_traits_json?: Json | null
          shared_traits_provenance_json?: Json | null
          status?: string
          updated_at?: string
          watch_reference_id?: string | null
        }
        Update: {
          aggregate_count?: number
          created_at?: string
          display_label?: string
          id?: string
          last_seen_at?: string
          normalized_brand_key?: string | null
          normalized_model_key?: string | null
          normalized_reference_key?: string | null
          shared_traits_json?: Json | null
          shared_traits_provenance_json?: Json | null
          status?: string
          updated_at?: string
          watch_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provisional_watch_identities_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
        }
        Relationships: []
      }
      styles: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      use_cases: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          revoke_reason: string | null
          revoked_at: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watch_analysis_traits: {
        Row: {
          analysis_confidence: number
          attachment_type: string | null
          bracelet_material_id: string | null
          brand_country_code: string | null
          case_diameter_mm: number | null
          case_material_id: string | null
          case_thickness_mm: number | null
          completeness_score: number
          created_at: string
          data_confidence: string
          dial_color_id: string | null
          function_codes_json: Json
          id: string
          lug_to_lug_mm: number | null
          movement_type_id: string | null
          normalization_status: string
          notes: string | null
          production_country_code: string | null
          strap_material_id: string | null
          style_scores_json: Json
          trait_confidence_json: Json
          trait_provenance_json: Json
          updated_at: string
          use_case_scores_json: Json
          user_id: string
          user_watch_id: string
          water_resistance_m: number | null
        }
        Insert: {
          analysis_confidence?: number
          attachment_type?: string | null
          bracelet_material_id?: string | null
          brand_country_code?: string | null
          case_diameter_mm?: number | null
          case_material_id?: string | null
          case_thickness_mm?: number | null
          completeness_score?: number
          created_at?: string
          data_confidence?: string
          dial_color_id?: string | null
          function_codes_json?: Json
          id?: string
          lug_to_lug_mm?: number | null
          movement_type_id?: string | null
          normalization_status?: string
          notes?: string | null
          production_country_code?: string | null
          strap_material_id?: string | null
          style_scores_json?: Json
          trait_confidence_json?: Json
          trait_provenance_json?: Json
          updated_at?: string
          use_case_scores_json?: Json
          user_id: string
          user_watch_id: string
          water_resistance_m?: number | null
        }
        Update: {
          analysis_confidence?: number
          attachment_type?: string | null
          bracelet_material_id?: string | null
          brand_country_code?: string | null
          case_diameter_mm?: number | null
          case_material_id?: string | null
          case_thickness_mm?: number | null
          completeness_score?: number
          created_at?: string
          data_confidence?: string
          dial_color_id?: string | null
          function_codes_json?: Json
          id?: string
          lug_to_lug_mm?: number | null
          movement_type_id?: string | null
          normalization_status?: string
          notes?: string | null
          production_country_code?: string | null
          strap_material_id?: string | null
          style_scores_json?: Json
          trait_confidence_json?: Json
          trait_provenance_json?: Json
          updated_at?: string
          use_case_scores_json?: Json
          user_id?: string
          user_watch_id?: string
          water_resistance_m?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_watch_analysis_traits_bracelet_material_id_fkey"
            columns: ["bracelet_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_analysis_traits_case_material_id_fkey"
            columns: ["case_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_analysis_traits_dial_color_id_fkey"
            columns: ["dial_color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_analysis_traits_movement_type_id_fkey"
            columns: ["movement_type_id"]
            isOneToOne: false
            referencedRelation: "movement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_analysis_traits_strap_material_id_fkey"
            columns: ["strap_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_analysis_traits_watch_owner_fk"
            columns: ["user_watch_id", "user_id"]
            isOneToOne: false
            referencedRelation: "user_watches"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      user_watch_collections: {
        Row: {
          collection_version: number
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          public_description_enabled: boolean
          public_slug: string | null
          published_at: string | null
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          collection_version?: number
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          public_description_enabled?: boolean
          public_slug?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          collection_version?: number
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          public_description_enabled?: boolean
          public_slug?: string | null
          published_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      user_watch_files: {
        Row: {
          created_at: string
          file_kind: string
          id: string
          mime_type: string
          original_filename: string | null
          owner_user_id: string
          size_bytes: number
          storage_bucket: string
          storage_path: string
          user_watch_id: string
        }
        Insert: {
          created_at?: string
          file_kind: string
          id?: string
          mime_type: string
          original_filename?: string | null
          owner_user_id: string
          size_bytes: number
          storage_bucket: string
          storage_path: string
          user_watch_id: string
        }
        Update: {
          created_at?: string
          file_kind?: string
          id?: string
          mime_type?: string
          original_filename?: string | null
          owner_user_id?: string
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          user_watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watch_files_watch_owner_fk"
            columns: ["user_watch_id", "owner_user_id"]
            isOneToOne: false
            referencedRelation: "user_watches"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      user_watch_match_candidates: {
        Row: {
          candidate_type: string
          created_at: string
          id: string
          match_confidence: string
          match_status: string
          provisional_watch_identity_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          score: number | null
          signals_json: Json
          user_id: string
          user_watch_id: string
          watch_reference_id: string | null
        }
        Insert: {
          candidate_type: string
          created_at?: string
          id?: string
          match_confidence: string
          match_status?: string
          provisional_watch_identity_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number | null
          signals_json?: Json
          user_id: string
          user_watch_id: string
          watch_reference_id?: string | null
        }
        Update: {
          candidate_type?: string
          created_at?: string
          id?: string
          match_confidence?: string
          match_status?: string
          provisional_watch_identity_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          score?: number | null
          signals_json?: Json
          user_id?: string
          user_watch_id?: string
          watch_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_watch_match_candidates_provisional_watch_identity_id_fkey"
            columns: ["provisional_watch_identity_id"]
            isOneToOne: false
            referencedRelation: "provisional_watch_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watch_match_candidates_watch_owner_fk"
            columns: ["user_watch_id", "user_id"]
            isOneToOne: false
            referencedRelation: "user_watches"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "user_watch_match_candidates_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watch_source_data: {
        Row: {
          created_at: string
          id: string
          raw_attachment: string | null
          raw_brand_name: string | null
          raw_case_material: string | null
          raw_case_size: string | null
          raw_dial_color: string | null
          raw_display_name: string | null
          raw_functions: string | null
          raw_model_name: string | null
          raw_movement: string | null
          raw_reference: string | null
          raw_water_resistance: string | null
          raw_year_or_period: string | null
          source_json: Json
          updated_at: string
          user_id: string
          user_watch_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_attachment?: string | null
          raw_brand_name?: string | null
          raw_case_material?: string | null
          raw_case_size?: string | null
          raw_dial_color?: string | null
          raw_display_name?: string | null
          raw_functions?: string | null
          raw_model_name?: string | null
          raw_movement?: string | null
          raw_reference?: string | null
          raw_water_resistance?: string | null
          raw_year_or_period?: string | null
          source_json?: Json
          updated_at?: string
          user_id: string
          user_watch_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_attachment?: string | null
          raw_brand_name?: string | null
          raw_case_material?: string | null
          raw_case_size?: string | null
          raw_dial_color?: string | null
          raw_display_name?: string | null
          raw_functions?: string | null
          raw_model_name?: string | null
          raw_movement?: string | null
          raw_reference?: string | null
          raw_water_resistance?: string | null
          raw_year_or_period?: string | null
          source_json?: Json
          updated_at?: string
          user_id?: string
          user_watch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watch_source_data_watch_owner_fk"
            columns: ["user_watch_id", "user_id"]
            isOneToOne: false
            referencedRelation: "user_watches"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      user_watches: {
        Row: {
          acquired_at: string | null
          acquisition_currency_code: string | null
          acquisition_price_minor: number | null
          acquisition_source: string | null
          created_at: string
          custom_brand_name: string | null
          custom_model_name: string | null
          custom_reference: string | null
          deleted_at: string | null
          display_name: string
          id: string
          ownership_status: string
          personal_note: string | null
          provisional_watch_identity_id: string | null
          public_visibility: string
          source_kind: string
          updated_at: string
          user_id: string
          user_watch_collection_id: string
          watch_reference_id: string | null
        }
        Insert: {
          acquired_at?: string | null
          acquisition_currency_code?: string | null
          acquisition_price_minor?: number | null
          acquisition_source?: string | null
          created_at?: string
          custom_brand_name?: string | null
          custom_model_name?: string | null
          custom_reference?: string | null
          deleted_at?: string | null
          display_name: string
          id?: string
          ownership_status?: string
          personal_note?: string | null
          provisional_watch_identity_id?: string | null
          public_visibility?: string
          source_kind: string
          updated_at?: string
          user_id: string
          user_watch_collection_id: string
          watch_reference_id?: string | null
        }
        Update: {
          acquired_at?: string | null
          acquisition_currency_code?: string | null
          acquisition_price_minor?: number | null
          acquisition_source?: string | null
          created_at?: string
          custom_brand_name?: string | null
          custom_model_name?: string | null
          custom_reference?: string | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          ownership_status?: string
          personal_note?: string | null
          provisional_watch_identity_id?: string | null
          public_visibility?: string
          source_kind?: string
          updated_at?: string
          user_id?: string
          user_watch_collection_id?: string
          watch_reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_watches_collection_owner_fk"
            columns: ["user_watch_collection_id", "user_id"]
            isOneToOne: false
            referencedRelation: "user_watch_collections"
            referencedColumns: ["id", "user_id"]
          },
          {
            foreignKeyName: "user_watches_provisional_identity_fk"
            columns: ["provisional_watch_identity_id"]
            isOneToOne: false
            referencedRelation: "provisional_watch_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watches_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_functions: {
        Row: {
          code: string
          created_at: string
          id: string
          label: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      watch_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          sort_order: number
          status: string
          storage_bucket: string
          storage_path: string
          updated_at: string
          watch_reference_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          status?: string
          storage_bucket: string
          storage_path: string
          updated_at?: string
          watch_reference_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          sort_order?: number
          status?: string
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_images_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_models: {
        Row: {
          brand_collection_id: string | null
          brand_id: string
          brand_line_id: string | null
          created_at: string
          description: string | null
          discontinued_year: number | null
          has_public_model_page: boolean
          id: string
          model_code: string | null
          model_status: string
          name: string
          name_normalized: string | null
          positioning: string | null
          release_year: number | null
          slug: string
          updated_at: string
        }
        Insert: {
          brand_collection_id?: string | null
          brand_id: string
          brand_line_id?: string | null
          created_at?: string
          description?: string | null
          discontinued_year?: number | null
          has_public_model_page?: boolean
          id?: string
          model_code?: string | null
          model_status?: string
          name: string
          name_normalized?: string | null
          positioning?: string | null
          release_year?: number | null
          slug: string
          updated_at?: string
        }
        Update: {
          brand_collection_id?: string | null
          brand_id?: string
          brand_line_id?: string | null
          created_at?: string
          description?: string | null
          discontinued_year?: number | null
          has_public_model_page?: boolean
          id?: string
          model_code?: string | null
          model_status?: string
          name?: string
          name_normalized?: string | null
          positioning?: string | null
          release_year?: number | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_models_collection_brand_fk"
            columns: ["brand_collection_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "brand_collections"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "watch_models_line_hierarchy_fk"
            columns: ["brand_line_id", "brand_id", "brand_collection_id"]
            isOneToOne: false
            referencedRelation: "brand_lines"
            referencedColumns: ["id", "brand_id", "brand_collection_id"]
          },
        ]
      }
      watch_reference_attribute_values: {
        Row: {
          attribute_definition_id: string
          attribute_option_id: string | null
          confidence: number
          created_at: string
          id: string
          source: string
          updated_at: string
          value_boolean: boolean | null
          value_numeric: number | null
          value_text: string | null
          watch_reference_id: string
        }
        Insert: {
          attribute_definition_id: string
          attribute_option_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          source?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_numeric?: number | null
          value_text?: string | null
          watch_reference_id: string
        }
        Update: {
          attribute_definition_id?: string
          attribute_option_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          source?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_numeric?: number | null
          value_text?: string | null
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_reference_attribute_values_attribute_definition_id_fkey"
            columns: ["attribute_definition_id"]
            isOneToOne: false
            referencedRelation: "attribute_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_reference_attribute_values_attribute_option_id_fkey"
            columns: ["attribute_option_id"]
            isOneToOne: false
            referencedRelation: "attribute_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_reference_attribute_values_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_reference_functions: {
        Row: {
          created_at: string
          function_id: string
          watch_reference_id: string
        }
        Insert: {
          created_at?: string
          function_id: string
          watch_reference_id: string
        }
        Update: {
          created_at?: string
          function_id?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_reference_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "watch_functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_reference_functions_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_reference_styles: {
        Row: {
          created_at: string
          score: number
          style_id: string
          watch_reference_id: string
        }
        Insert: {
          created_at?: string
          score?: number
          style_id: string
          watch_reference_id: string
        }
        Update: {
          created_at?: string
          score?: number
          style_id?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_reference_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_reference_styles_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_reference_use_cases: {
        Row: {
          created_at: string
          score: number
          use_case_id: string
          watch_reference_id: string
        }
        Insert: {
          created_at?: string
          score?: number
          use_case_id: string
          watch_reference_id: string
        }
        Update: {
          created_at?: string
          score?: number
          use_case_id?: string
          watch_reference_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_reference_use_cases_use_case_id_fkey"
            columns: ["use_case_id"]
            isOneToOne: false
            referencedRelation: "use_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_reference_use_cases_watch_reference_id_fkey"
            columns: ["watch_reference_id"]
            isOneToOne: false
            referencedRelation: "watch_references"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_references: {
        Row: {
          authenticity_description: string | null
          bracelet_material_id: string | null
          brand_country_code: string | null
          brand_id: string
          case_coating_material_id: string | null
          case_color_id: string | null
          case_diameter_mm: number | null
          case_material_id: string | null
          case_shape_id: string | null
          case_thickness_mm: number | null
          case_width_mm: number | null
          clasp_type_id: string | null
          created_at: string
          crystal_type_id: string | null
          data_confidence: string
          description: string | null
          dial_color_id: string | null
          display_name: string
          fit_description: string | null
          has_alarm: boolean
          has_chronograph: boolean
          has_date: boolean
          has_day_date: boolean
          has_gmt: boolean
          has_moon_phase: boolean
          has_rotating_bezel: boolean
          has_stopwatch: boolean
          has_tachymeter: boolean
          has_timer: boolean
          has_world_time: boolean
          id: string
          lug_to_lug_mm: number | null
          lug_width_mm: number | null
          movement_description: string | null
          movement_id: string | null
          movement_type_id: string | null
          production_country_code: string | null
          reference_code_display: string
          reference_code_normalized: string | null
          reference_status: string
          set_contents_description: string | null
          short_description: string | null
          slug: string
          status: string
          strap_material_id: string | null
          updated_at: string
          watch_model_id: string
          water_resistance_description: string | null
          water_resistance_m: number | null
          weight_g: number | null
        }
        Insert: {
          authenticity_description?: string | null
          bracelet_material_id?: string | null
          brand_country_code?: string | null
          brand_id: string
          case_coating_material_id?: string | null
          case_color_id?: string | null
          case_diameter_mm?: number | null
          case_material_id?: string | null
          case_shape_id?: string | null
          case_thickness_mm?: number | null
          case_width_mm?: number | null
          clasp_type_id?: string | null
          created_at?: string
          crystal_type_id?: string | null
          data_confidence?: string
          description?: string | null
          dial_color_id?: string | null
          display_name: string
          fit_description?: string | null
          has_alarm?: boolean
          has_chronograph?: boolean
          has_date?: boolean
          has_day_date?: boolean
          has_gmt?: boolean
          has_moon_phase?: boolean
          has_rotating_bezel?: boolean
          has_stopwatch?: boolean
          has_tachymeter?: boolean
          has_timer?: boolean
          has_world_time?: boolean
          id?: string
          lug_to_lug_mm?: number | null
          lug_width_mm?: number | null
          movement_description?: string | null
          movement_id?: string | null
          movement_type_id?: string | null
          production_country_code?: string | null
          reference_code_display: string
          reference_code_normalized?: string | null
          reference_status?: string
          set_contents_description?: string | null
          short_description?: string | null
          slug: string
          status?: string
          strap_material_id?: string | null
          updated_at?: string
          watch_model_id: string
          water_resistance_description?: string | null
          water_resistance_m?: number | null
          weight_g?: number | null
        }
        Update: {
          authenticity_description?: string | null
          bracelet_material_id?: string | null
          brand_country_code?: string | null
          brand_id?: string
          case_coating_material_id?: string | null
          case_color_id?: string | null
          case_diameter_mm?: number | null
          case_material_id?: string | null
          case_shape_id?: string | null
          case_thickness_mm?: number | null
          case_width_mm?: number | null
          clasp_type_id?: string | null
          created_at?: string
          crystal_type_id?: string | null
          data_confidence?: string
          description?: string | null
          dial_color_id?: string | null
          display_name?: string
          fit_description?: string | null
          has_alarm?: boolean
          has_chronograph?: boolean
          has_date?: boolean
          has_day_date?: boolean
          has_gmt?: boolean
          has_moon_phase?: boolean
          has_rotating_bezel?: boolean
          has_stopwatch?: boolean
          has_tachymeter?: boolean
          has_timer?: boolean
          has_world_time?: boolean
          id?: string
          lug_to_lug_mm?: number | null
          lug_width_mm?: number | null
          movement_description?: string | null
          movement_id?: string | null
          movement_type_id?: string | null
          production_country_code?: string | null
          reference_code_display?: string
          reference_code_normalized?: string | null
          reference_status?: string
          set_contents_description?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          strap_material_id?: string | null
          updated_at?: string
          watch_model_id?: string
          water_resistance_description?: string | null
          water_resistance_m?: number | null
          weight_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "watch_references_bracelet_material_id_fkey"
            columns: ["bracelet_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_case_coating_material_id_fkey"
            columns: ["case_coating_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_case_color_id_fkey"
            columns: ["case_color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_case_material_id_fkey"
            columns: ["case_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_case_shape_id_fkey"
            columns: ["case_shape_id"]
            isOneToOne: false
            referencedRelation: "case_shapes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_clasp_type_id_fkey"
            columns: ["clasp_type_id"]
            isOneToOne: false
            referencedRelation: "clasp_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_crystal_type_id_fkey"
            columns: ["crystal_type_id"]
            isOneToOne: false
            referencedRelation: "crystal_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_dial_color_id_fkey"
            columns: ["dial_color_id"]
            isOneToOne: false
            referencedRelation: "colors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_model_brand_fk"
            columns: ["watch_model_id", "brand_id"]
            isOneToOne: false
            referencedRelation: "watch_models"
            referencedColumns: ["id", "brand_id"]
          },
          {
            foreignKeyName: "watch_references_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_movement_type_id_fkey"
            columns: ["movement_type_id"]
            isOneToOne: false
            referencedRelation: "movement_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_references_strap_material_id_fkey"
            columns: ["strap_material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_catalog_import_batch: { Args: { input: Json }; Returns: Json }
      apply_catalog_public_read_models: { Args: { input: Json }; Returns: Json }
      create_catalog_user_watch: {
        Args: {
          input_allow_duplicate?: boolean
          input_display_name?: string
          input_watch_reference_id: string
        }
        Returns: string
      }
      create_manual_user_watch: {
        Args: {
          input_brand_name?: string
          input_display_name: string
          input_model_name?: string
          input_note?: string
          input_reference?: string
        }
        Returns: string
      }
      current_user_has_any_role: {
        Args: { required_roles: string[] }
        Returns: boolean
      }
      current_user_has_role: {
        Args: { required_role: string }
        Returns: boolean
      }
      ensure_user_watch_collection: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      is_catalog_slug: { Args: { input: string }; Returns: boolean }
      normalize_catalog_text: { Args: { input: string }; Returns: string }
      normalize_reference_code: { Args: { input: string }; Returns: string }
    }
    Enums: {
      checkout_source: "buy_now" | "cart"
      order_payment_status:
        | "not_started"
        | "pending"
        | "succeeded"
        | "partially_refunded"
        | "refunded"
      order_shipment_status:
        | "pending_creation"
        | "creation_in_progress"
        | "creation_pending_retry"
        | "creation_failed"
        | "created"
        | "handed_over"
        | "in_transit"
        | "arrived_at_pickup_point"
        | "ready_for_pickup"
        | "delivered"
        | "returning"
        | "returned"
        | "problem"
      order_status:
        | "awaiting_payment"
        | "paid"
        | "processing"
        | "supplier_ordered"
        | "in_transit"
        | "local_delivery"
        | "completed"
        | "cancelled"
      payment_attempt_status:
        | "created"
        | "pending"
        | "waiting_for_capture"
        | "succeeded"
        | "canceled"
        | "failed"
      payment_refund_status: "pending" | "succeeded" | "canceled" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      checkout_source: ["buy_now", "cart"],
      order_payment_status: [
        "not_started",
        "pending",
        "succeeded",
        "partially_refunded",
        "refunded",
      ],
      order_status: [
        "awaiting_payment",
        "paid",
        "processing",
        "supplier_ordered",
        "in_transit",
        "local_delivery",
        "completed",
        "cancelled",
      ],
      payment_attempt_status: [
        "created",
        "pending",
        "waiting_for_capture",
        "succeeded",
        "canceled",
        "failed",
      ],
      payment_refund_status: ["pending", "succeeded", "canceled", "failed"],
    },
  },
} as const
