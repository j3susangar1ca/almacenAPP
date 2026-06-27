import { BudgetAggregate } from '../core/domain/entities/BudgetAggregate';
import { eventBus, EVENTS } from '../../server/services/EventBus';

/**
 * Invariant Test 1: Validar que el BudgetAggregate arroje una excepción de dominio 
 * si una adjudicación de licitación supera los fondos disponibles de la partida pública.
 */
export function testBudgetAggregateThrowsOnInsufficientFunds() {
  console.log('[TEST] Iniciando: Invariante del BudgetAggregate ante sobregiro...');
  
  const mockBudget = {
    id: 'B-TEST',
    code: 'P-TEST',
    name: 'Partida de Prueba Pública',
    allocatedAmount: 10000,
    committedAmount: 2000,
    executedAmount: 3000,
    availableAmount: 5000 // 10000 - 2000 - 3000
  };

  const aggregate = new BudgetAggregate(mockBudget);

  // Verificar estado inicial disponible recalculado
  if (aggregate.getProps().availableAmount !== 5000) {
    throw new Error(`Prueba Fallida: Se esperaba disponible de 5000, se obtuvo ${aggregate.getProps().availableAmount}`);
  }

  // Intentar comprometer S/. 6,000 (supera el disponible de S/. 5,000)
  let exceptionThrown = false;
  try {
    aggregate.commitAmount(6000);
  } catch (err: any) {
    exceptionThrown = true;
    console.log(`  ✓ Excepción atrapada correctamente: "${err.message}"`);
  }

  if (!exceptionThrown) {
    throw new Error('Prueba Fallida: El BudgetAggregate debió arrojar una excepción ante fondos insuficientes.');
  }
  
  console.log('✓ Prueba del BudgetAggregate completada exitosamente.');
}

/**
 * Invariant Test 2: Validar que el EventBus despache correctamente el evento 
 * 'StockBelowMinimum' cuando el stock baje de su límite de seguridad.
 */
export function testEventBusDispatchesStockBelowMinimum(done?: () => void) {
  console.log('[TEST] Iniciando: Despacho de EventBus "StockBelowMinimum"...');

  let eventReceived = false;
  let receivedPayload: any = null;

  // Registrar listener en el EventBus de la arquitectura limpia
  const listener = (payload: any) => {
    eventReceived = true;
    receivedPayload = payload;
  };

  eventBus.on(EVENTS.STOCK_BELOW_MINIMUM, listener);

  const testPayload = {
    itemId: 'I-01',
    name: 'Arroz Extra Grano Largo',
    sku: 'SKU-ARR-001',
    stockActual: 10,
    stockMinimo: 50
  };

  // Publicar el evento de stock bajo el mínimo
  eventBus.publish(EVENTS.STOCK_BELOW_MINIMUM, testPayload);

  // Esperar a que setImmediate / asincronía resuelva el evento
  setTimeout(() => {
    eventBus.off(EVENTS.STOCK_BELOW_MINIMUM, listener);

    if (!eventReceived) {
      throw new Error('Prueba Fallida: El EventBus no despachó el evento "StockBelowMinimum".');
    }
    
    if (receivedPayload.sku !== 'SKU-ARR-001') {
      throw new Error(`Prueba Fallida: Se esperaba SKU-ARR-001 en el payload, se obtuvo: ${receivedPayload.sku}`);
    }

    console.log('✓ Prueba del EventBus completada exitosamente.');
    if (done) done();
  }, 100);
}

// Simple test runner
export function runAllTests() {
  console.log('\n======================================================');
  console.log('INICIANDO BANCO DE PRUEBAS SIGAL V2 - CORE DOMAIN');
  console.log('======================================================');
  try {
    testBudgetAggregateThrowsOnInsufficientFunds();
    testEventBusDispatchesStockBelowMinimum(() => {
      console.log('======================================================');
      console.log('✓ TODAS LAS PRUEBAS DE INVARIANTES PASARON SATISFACTORIAMENTE');
      console.log('======================================================\n');
    });
  } catch (error: any) {
    console.error('❌ BANCO DE PRUEBAS CON ERRORES:', error.message);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && (process.argv[1].endsWith('businessInvariants.test.ts') || process.argv[1].endsWith('businessInvariants.test.js'))) {
  runAllTests();
}
