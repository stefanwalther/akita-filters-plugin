import {DataSource} from '@angular/cdk/table';
import {BehaviorSubject, combineLatest, merge, Observable, of, Subject, Subscription} from 'rxjs';
import {EntityState, ID, Order, QueryEntity} from '@datorama/akita';
import {AkitaFilter} from '../akita-filters-store';
import {AkitaFiltersPlugin} from '../akita-filters-plugin';
import {map, takeUntil, tap} from 'rxjs/operators';
import {MatSort, Sort} from '@angular/material/sort';
import { MatPaginator, PageEvent } from '@angular/material/paginator';

export class AkitaMatDataSource<E, S extends EntityState = any> extends DataSource<E> {




  /**
   * Data source to use an Akita EntityStore with a Material table
   * @see : https://material.angular.io/components/table/overview
   *
   * @param query string : [Mandatory] the akita Query Entity, you wan to use to this data source.
   * @param akitaFilters string [Optional] If you want to provide an AkitaFilters that you use externally. Else it will create a new one.
   */
  constructor(query: QueryEntity<E> | any, akitaFilters?: AkitaFiltersPlugin<S, E>) {
    super();
    this._dataQuery = query;

    this._filters = akitaFilters ? akitaFilters : new AkitaFiltersPlugin<S, E>(query);
    this._hasCustomFilters = !!akitaFilters;
    this._count$ = new BehaviorSubject(0);
    // @ts-ignore ignore, as without options, we will allways have an Array.
    this._selectAllByFilter$ = this._filters.selectAllByFilters()
      .pipe(tap(value => this._updateCount(value)));
    this._updateChangeSubscription();
  }

  /**
   * @param searchQuery teh string use to search
   */
  set filter(searchQuery: string) {
    this.search = searchQuery;
  }

  /**
   * filter all the list by a search term.
   *
   * use like a property :
   * akitaMatDataSourceInstance.search = 'term';
   * @param searchQuery the string use to search
   */
  set search(searchQuery: string) {
    if (searchQuery === '') {
      this._filters.removeFilter('search');
    } else {
      this._filters.setFilter({id: 'search', value: searchQuery});
    }
  }

  /**
   * Instance of the MatSort directive used by the table to control its sorting. Sort changes
   * emitted by the MatSort will trigger an update to the table's rendered data.
   */
  set sort(sort: MatSort) {
    this._sort = sort;
    sort.sortChange.pipe(takeUntil(this._disconnect)).subscribe((sortValue: Sort) => {
      this._filters.setSortBy({
        sortBy: sortValue.active as keyof E,
        sortByOrder: sortValue.direction === 'desc' ? Order.DESC : Order.ASC
      });
    });

    sort.initialized.subscribe(() => {
      this.setDefaultSort(sort.active as keyof E, sort.direction === 'desc' ? Order.DESC : Order.ASC);
    });
  }

  /**
   * Instance of the MatPaginator component used by the table to control what page of the data is
   * displayed. Page changes emitted by the MatPaginator will trigger an update to the
   * table's rendered data.
   *
   * Note that the data source uses the paginator's properties to calculate which page of data
   * should be displayed. If the paginator receives its properties as template inputs,
   * e.g. `[pageLength]=100` or `[pageIndex]=1`, then be sure that the paginator's view has been
   * initialized before assigning it to this data source.
   */
  get paginator(): MatPaginator {
    return this._paginator;
  }

  set paginator(paginator: MatPaginator) {
    this._paginator = paginator;
    this._updateChangeSubscription();
  }

  /**
   * @deprecated use get akitaFiltersPlugin
   */
  get AkitaFilters(): AkitaFiltersPlugin<S, E, any> {
    return this._filters;
  }
  /**
   * Access to AkitaFiltersPlugins, usefull to interact with all filters
   */
  get akitaFiltersPlugIn(): AkitaFiltersPlugin<S, E> {
    return this._filters;
  }

  private _dataQuery: QueryEntity<E>;
  private readonly _filters: AkitaFiltersPlugin<S, E>;
  /** if set a custom filter plugins, do not delete all in disconnect() **/
  private _hasCustomFilters: boolean;
  private _paginator: MatPaginator = null;
  private _sort: MatSort = null;

  private _selectAllByFilter$: Observable<E[]>;
  private _count$: BehaviorSubject<number>;
  /** Used to react to internal changes of the paginator that are made by the data source itself. */
  private readonly _internalPageChanges = new Subject<void>();
  /** Stream emitting render data to the table (depends on ordered data changes). */
  private readonly _renderData = new BehaviorSubject<E[]>([]);
  /** Used to react to internal changes of the paginator that are made by the data source itself. */
  private readonly _disconnect = new Subject<void>();



  /**
   * Subscription to the changes that should trigger an update to the table's rendered rows, such
   * as filtering, sorting, pagination, or base data changes.
   */
  _renderChangesSubscription = Subscription.EMPTY;

  private _updateCount(value) {
    const count = value.length ? value.length : 0;
    if (count !== this._count$.getValue()) {
      this._count$.next(count);

      if (this.paginator) { this._updatePaginator(count); }
    }
  }

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private _pageData(data: E[]) {
    if (!this.paginator) { return data; }

    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.slice(startIndex, startIndex + this.paginator.pageSize);
  }

  /**
   *  add a filter to filters plugins
   */
  addFilter(filter: Partial<AkitaFilter<E, S>>): void {
    this._filters.setFilter(filter);
  }

  /**
   *  add a filter to filters plugins
   */
  setFilter(filter: Partial<AkitaFilter<E, S>>): void {
    this._filters.setFilter(filter);
  }

  /**
   * Remove a AkitaFilter
   */
  removeFilter(id: ID): void {
    this._filters.removeFilter(id);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this._filters.clearFilters();
  }

  /**
   * Get filter value, return null, if value not available
   */
  getFilterValue<V = E>(id: string): V | null {
    return this._filters.getFilterValue(id);
  }

  /**
   * Set the default sort
   * @param sortColumun the colum name present in your object
   * @param direction string the direction for sorting (asc or desc). Default asc.
   */
  public setDefaultSort(
    sortColumun: keyof E,
    direction: 'asc' | 'desc' = 'asc'
  ) {
    this._filters.setSortBy({
      sortBy: sortColumun,
      sortByOrder: direction === 'desc' ? Order.DESC : Order.ASC
    });
  }

  /**
   * Select Count filtered results.
   */
  selectCount(): Observable<number> {
    return this._count$.asObservable();
  }

  /**
   * Select Count filtered results.
   */
  getCount(): number {
    return this._count$.getValue();
  }

  /**
   * Subscribe to changes that should trigger an update to the table's rendered rows. When the
   * changes occur, process the current state of the filter, sort, and pagination along with
   * the provided base data and send it to the table for rendering.
   */
  _updateChangeSubscription() {
    // Sorting and/or pagination should be watched if MatSort and/or MatPaginator are provided.
    // The events should emit whenever the component emits a change or initializes, or if no
    // component is provided, a stream with just a null event should be provided.
    // The `sortChange` and `pageChange` acts as a signal to the combineLatests below so that the
    // pipeline can progress to the next step. Note that the value from these streams are not used,
    // they purely act as a signal to progress in the pipeline.

    const pageChange: Observable<PageEvent|null|void> = this._paginator ?
      merge(
        this._paginator.page,
        this._internalPageChanges,
        this._paginator.initialized
      ) as Observable<PageEvent|void> :
      of(null);

    const paginatedData = combineLatest(this._selectAllByFilter$, pageChange)
      .pipe(map(([data]) => this._pageData(data)));
    // Watched for paged data changes and send the result to the table to render.
    this._renderChangesSubscription.unsubscribe();
    this._renderChangesSubscription = paginatedData.pipe(takeUntil(this._disconnect)).subscribe(data => this._renderData.next(data));
    this._internalPageChanges.next();
  }

  /**
   * Updates the paginator to reflect the length of the filtered data, and makes sure that the page
   * index does not exceed the paginator's last page. Values are changed in a resolved promise to
   * guard against making property changes within a round of change detection.
   */
  _updatePaginator(filteredDataLength: number) {
    Promise.resolve().then(() => {
      const paginator = this.paginator;

      if (!paginator) { return; }

      paginator.length = filteredDataLength;

      // If the page index is set beyond the page, reduce it to the last page.
      if (paginator.pageIndex > 0) {
        const lastPageIndex = Math.ceil(paginator.length / paginator.pageSize) - 1 || 0;
        const newPageIndex = Math.min(paginator.pageIndex, lastPageIndex);

        if (newPageIndex !== paginator.pageIndex) {
          paginator.pageIndex = newPageIndex;

          // Since the paginator only emits after user-generated changes,
          // we need our own stream so we know to should re-render the data.
          this._internalPageChanges.next();
        }
      }
    });
  }

  /**
   * Function used by matTable to subscribe to the data
   */
  connect(): Observable<E[]> {
    return this._renderData;
  }


  /**
   * Used by the MatTable. Called when it is destroyed. No-op.
   * @docs-private
   */
  disconnect(): void {
    if (!this._hasCustomFilters) {
      this._filters.clearFilters();
      this._filters.destroy();
    }
    this._disconnect.next();
    this._disconnect.complete();
  }
}
