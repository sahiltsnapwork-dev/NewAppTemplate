// Selectors: Order Cancel
import type { RootState } from '../../../../store/rootReducer';

export const selectOrderCancelIsLoading = (state: RootState) => state.orderCancel.isLoading;
export const selectSelectedOrder = (state: RootState) => state.orderCancel.selectedOrder;
export const selectCancelAction = (state: RootState) => state.orderCancel.cancelAction;
export const selectMarketStatus = (state: RootState) => state.orderCancel.marketStatus;
export const selectCancelResult = (state: RootState) => state.orderCancel.result;
export const selectAlertDialog = (state: RootState) => state.orderCancel.alertDialog;
export const selectFundShortfall = (state: RootState) => state.orderCancel.fundShortfall;
export const selectQuantityShortfall = (state: RootState) => state.orderCancel.quantityShortfall;
export const selectOrderCancelError = (state: RootState) => state.orderCancel.error;
