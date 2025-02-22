
import { defaultFilter } from './filters-utils';
import {EntityState, EntityStore, getEntityType, guid, HashMap, ID, SortByOptions, StoreConfig} from '@datorama/akita';

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.substr(1);
}

export interface AkitaFilter<E, S = any> {
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
  predicate: ( entity: E | getEntityType<S>, index: number, array: E[] | HashMap<getEntityType<S>>, filter: AkitaFilter<E, S> ) => boolean;
  /** add any other data you want to add **/
  [key: string]: any;
}

export function createFilter<E, S = any>( filterParams: Partial<AkitaFilter<E, S>> ) {
  const id = filterParams.id ? filterParams.id : guid();
  const name = filterParams.name || (filterParams.value && filterParams.id ?
    `${capitalize(filterParams.id.toString())}: ${filterParams.value.toString()}` : undefined);

  if ( !filterParams.predicate && filterParams.value ) {
    /** use default function, if not provided */
    // @ts-ignore
    filterParams.predicate = defaultFilter;
  }

  return { id, name, hide: false, order: 10, server: false, ...filterParams } as AkitaFilter<E>;
}

export interface FiltersState<E, S extends  FiltersState<E> = any> extends EntityState<AkitaFilter<E, S>> {
  sort: SortByOptions<any>;
}

@StoreConfig({ name: 'filters' })
export class AkitaFiltersStore<E> extends EntityStore<FiltersState<E>, AkitaFilter<E>> {
  constructor( storeName: string ) {
    super(undefined, { name: storeName });
  }
}
