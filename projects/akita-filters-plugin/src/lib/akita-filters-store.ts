
import { defaultFilter } from './filters-utils';
import {EntityState, EntityStore, guid, ID, SortByOptions, StoreConfig} from '@datorama/akita';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

export interface AkitaFilter<E> {
  id: ID;
  /** A corresponding name for display the filter, by default, it will be ${id): ${value}  */
  name?: string;
  /** set the order for filter, by default, it is 10 */
  order?: number;
  /** The filter value, this will be used to compute name, or getting the current value, to initiate your form */
  value?: any;
  /** If you want to have filter that is not displayed on the list */
  hide?: boolean;
  /** If you have enabled server filter, specify witch filters will be call to server, default to false. */
  server?: boolean;
  /** The function to apply filters, by default use defaultFilter helpers, that will search the value in the object */
  predicate: ( entity: E, index: number, array: E[], filter: AkitaFilter<E> ) => boolean;
  /** add any other data you want to add **/
  [key: string]: any;
}

export function createFilter<E>( filterParams: Partial<AkitaFilter<E>> ) {
  const id = filterParams.id ? filterParams.id : guid();
  const name = filterParams.name || (filterParams.value && filterParams.id ?
    `${capitalize(filterParams.id.toString())}: ${filterParams.value.toString()}` : undefined);

  if ( !filterParams.predicate && filterParams.value ) {
    /** use default function, if not provided */
    filterParams.predicate = defaultFilter;
  }

  return { id, name, hide: false, order: 10, server: false, ...filterParams } as AkitaFilter<E>;
}

export interface FiltersState<E> extends EntityState<AkitaFilter<E>> {
  sort: SortByOptions<any>;
}

@StoreConfig({ name: 'filters' })
export class AkitaFiltersStore<E> extends EntityStore<FiltersState<E>, AkitaFilter<E>> {
  constructor( storeName: string ) {
    super(undefined, { storeName });
  }
}
