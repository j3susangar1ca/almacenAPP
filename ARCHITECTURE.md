# ARCHITECTURE.md: SIGAL V2 Enterprise ERP
## Living Architecture & Design Document

Este documento describe el razonamiento arquitectónico, la estructura del dominio y el diseño de la solución corporativa para **SIGAL V2: Sistema Integrado de Gestión de Almacén de Víveres Públicos, Licitaciones y Menús Institucionales**.

---

## 1. Bounded Contexts (Domain-Driven Design)

El sistema se organiza en cuatro grandes contextos acotados, cada uno con sus propios agregados, entidades y reglas invariantes:

### 1.1. InventoryContext (Gestión de Stock y Trazabilidad)
*   **Agregado Raíz:** `StockItem` (Artículos de inventario).
*   **Entidades:** `Warehouse` (Almacenes físicos), `StockTransaction` (Kardex de entradas y salidas), `Batch` (Lotes con fecha de vencimiento).
*   **Objetos de Valor:** `SKU` (Formato estandarizado), `Quantity` (Cantidad con unidad de medida), `Money` (Costo y precio).
*   **Invariantes de Dominio:** 
    *   No se pueden realizar salidas de stock si la cantidad solicitada excede la cantidad física actual disponible (`StockActual`).
    *   Todo movimiento físico debe inyectar una fila atómica en el Kardex de transacciones, calculando la diferencia del saldo de forma inmediata.

### 1.2. ProcurementContext (Licitaciones y Contratos de Proveedores)
*   **Agregado Raíz:** `Tender` (Proceso de licitación pública).
*   **Entidades:** `Bid` (Oferta económica y técnica de proveedor), `Supplier` (Proveedor registrado), `Contract` (Acuerdo contractual firmado).
*   **Objetos de Valor:** `BiddingStatus` (Borrador, Publicada, Evaluación, Adjudicada, Cerrada, Desierta).
*   **Invariantes de Dominio:**
    *   Solo se pueden recibir ofertas (`Bid`) para licitaciones en estado `Publicada`.
    *   Al adjudicar una licitación, se pasa al estado `Adjudicada`, registrando al ganador y disparando la generación automatizada del contrato.

### 1.3. NutritionContext (Planificación Nutricional y BOM)
*   **Agregado Raíz:** `Menu` (Planificación del menú mensual).
*   **Entidades:** `Recipe` (Ficha técnica con ingredientes / Bill of Materials), `IngredientDemand` (Cálculo de explosión de insumos).
*   **Invariantes de Dominio:**
    *   La explosión de insumos calcula exactamente los gramos requeridos multiplicando los ingredientes por porción por el número total de beneficiarios.
    *   Al marcar un menú como "Servido y Aprobado", se debe descontar de manera atómica el inventario correspondiente en Firestore.

### 1.4. ResourcesContext (Recursos, Flotas y Control Financiero)
*   **Agregado Raíz:** `Budget` (Partida presupuestal).
*   **Entidades:** `StaffMember` (Turnos y tareas de personal), `Vehicle` (Flota de reparto y mantenimiento), `Equipment` (Cámaras de refrigeración).
*   **Invariantes de Dominio:**
    *   No se pueden aprobar licitaciones u órdenes de compra que superen el saldo disponible de la partida presupuestaria asociada, previniendo el sobregiro financiero.

---

## 2. Clean Architecture (Estructura de Capas)

El código se divide estrictamente en capas para evitar el acoplamiento y asegurar la mantenibilidad:

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation (React)                   │
│  Features: Dashboard, Inventory, Procurement, Nutrition   │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    Application (CQRS)                     │
│    Commands (Mutation)  │  Queries (Analytical Views)     │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│                     Domain (Pure ES)                      │
│       Entities, Value Objects, Domain Events, Rules       │
└─────────────────────────────▲─────────────────────────────┘
                              │
┌─────────────────────────────┴─────────────────────────────┐
│                 Infrastructure (Adapters)                 │
│   Firestore Repos, Workspace Connectors, Gemini Client    │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Event-Driven Architecture (EDA)

Los procesos de negocio inter-contextos se comunican de forma asíncrona a través de eventos para mantener la consistencia eventual y desacoplar las responsabilidades. El backend implementa un `EventBus` en memoria para coordinar la publicación y suscripción de eventos obligatorios:

1.  `StockBelowMinimum`: Disparado cuando el stock actual cae por debajo del nivel de seguridad. Genera alerta en el panel de compras.
2.  `PurchaseApproved`: Genera el compromiso presupuestario y actualiza el saldo financiero disponible.
3.  `TenderAwarded`: Notifica a los proveedores y crea automáticamente la estructura en Google Docs / Gmail.
4.  `MenuPublished`: Registra los eventos en Google Calendar para la cocina y el equipo de logística.
5.  `InventoryConsumed`: Actualiza los niveles de stock en Firestore y genera la traza en el Kardex físico.
6.  `GoodsReceived`: Incrementa las existencias físicas del almacén a partir de un remito (procesado vía OCR con Gemini).

---

## 4. Matriz de Roles y Accesos (RBAC)

Se implementa un sistema estricto de control de acceso basado en roles en Firebase Auth (mediante claims mapeados a la base de datos de usuarios en Firestore) y validado en el enrutamiento del Frontend y middlewares del API en el Backend:

*   **Administrador:** Acceso total, auditoría forense de cambios de base de datos y cuotas globales.
*   **Almacenero:** Operaciones completas del módulo de inventario, lotes y Kardex físico.
*   **Comprador:** Gestión completa de licitaciones, contratos, catálogo de proveedores y partidas presupuestarias.
*   **Jefe de Cocina:** Programación de menús, recetas, explosión de insumos y autorizaciones de consumo.
*   **Auditor:** Solo lectura. Reportes contables, conciliación de gastos y logs forenses de auditoría inmutable.

---

## 5. Google Workspace & Gemini AI (Protocolo de Conectividad)

### Sincronización Asíncrona Resiliente
Firestore es el almacenamiento central transaccional y offline-first. Las integraciones con Google Workspace son asíncronas y resilientes a fallos:
*   Si una API de Google Workspace falla (e.g., cuota o límite de red), la acción se guarda localmente en Firestore, marcándose como "Pendiente de Sincronización" (`syncPending: true`), y el frontend muestra un aviso descriptivo y elegante de guardado exitoso local.

### Servicios IA con Gemini:
*   **Inventory AI / Forecast AI:** Modelado de series temporales para predecir desabastecimientos basados en el consumo histórico mensual.
*   **Procurement AI / Legal AI:** Resumen inteligente de propuestas complejas de licitación y análisis de desviación presupuestaria.
*   **Nutrition AI:** Evaluación macro-nutricional y sugerencia de recetas alternativas basadas en los ingredientes que están próximos a vencer o que tienen exceso de stock.
*   **OCR Intelligent Agent:** Extracción automática de facturas y remisiones mediante análisis de imagen/documento estructurado con Gemini Vision, pre-llenando las entradas físicas de stock de forma automatizada.

---

## 6. Consolidación de Capas y Refactorización (Fase de Cierre)

Como parte del proceso de maduración de la arquitectura limpia de **SIGAL V2**, se realizaron las siguientes mejoras fundamentales:

### 6.1. Inyección de Agregados del Dominio (DDD Invariants)
*   **BudgetAggregate (`/src/core/domain/entities/BudgetAggregate.ts`):** Centraliza las reglas de negocio para comprometer, ejecutar y liberar presupuestos, manteniendo la invariante `availableAmount = allocatedAmount - committedAmount - executedAmount`.
*   **ResourceAggregate (`/src/core/domain/entities/ResourceAggregate.ts`):** Modela la lógica pura para la asignación válida de turnos de personal, la programación automática de mantenimientos vehiculares y preventivos de equipamiento de frío.

### 6.2. Capa de Aplicación Analytics
*   **MonthlyProgramQueries (`/src/core/application/queries/getMonthlyProgramQueries.ts`):** Proporciona las queries necesarias para alimentar la grilla de programación mensual (Módulo F), calculando métricas avanzadas como la desviación contra el promedio histórico.

### 6.3. Desacoplamiento y Modularización del Servidor Express
*   Se eliminaron todos los endpoints embebidos masivos de `server.ts` y se estructuró una capa de enrutamiento limpia en `server/routes/`:
    *   **aiRoutes.ts:** Controladores HTTP de Gemini AI (Forecast, Procurement Evaluation, Nutrition Audit, Invoice OCR) interactuando con la nueva clase unificada de negocio **GeminiAIService**.
    *   **inventoryRoutes.ts:** Gestión de sincronización de almacenes con Google Sheets y Google Drive.
    *   **procurementRoutes.ts:** Integraciones complejas con Google Docs, Gmail, Calendar, People/Contacts y Google Chat, coordinados con el motor de FSM.
*   `server.ts` ahora actúa únicamente como el punto de orquestación central e inicialización de Middlewares y Event Listeners.

