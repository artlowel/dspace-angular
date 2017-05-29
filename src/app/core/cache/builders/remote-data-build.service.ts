import { Injectable } from "@angular/core";
import { CacheableObject } from "../object-cache.reducer";
import { ObjectCacheService } from "../object-cache.service";
import { RequestService } from "../../data/request.service";
import { ResponseCacheService } from "../response-cache.service";
import { Store } from "@ngrx/store";
import { CoreState } from "../../core.reducers";
import { RequestEntry } from "../../data/request.reducer";
import { hasValue, isNotEmpty } from "../../../shared/empty.util";
import { ResponseCacheEntry } from "../response-cache.reducer";
import { ErrorResponse, SuccessResponse } from "../response-cache.models";
import { Observable } from "rxjs/Observable";
import { RemoteData } from "../../data/remote-data";
import { GenericConstructor } from "../../shared/generic-constructor";
import { getMapsTo, getResourceType, getRelationships } from "./build-decorators";
import { NormalizedDSOFactory } from "../models/normalized-dspace-object-factory";

@Injectable()
export class RemoteDataBuildService {
  constructor(
    protected objectCache: ObjectCacheService,
    protected responseCache: ResponseCacheService,
    protected requestService: RequestService,
    protected store: Store<CoreState>,
  ) {
  }

  buildSingle<TNormalized extends CacheableObject, TDomain>(
    href: string,
    normalizedType: GenericConstructor<TNormalized>
  ): RemoteData<TDomain> {
    const requestObs = this.store.select<RequestEntry>('core', 'data', 'request', href);
    const responseCacheObs = this.responseCache.get(href);

    const requestPending = requestObs.map((entry: RequestEntry) => hasValue(entry) && entry.requestPending).distinctUntilChanged();

    const responsePending = requestObs.map((entry: RequestEntry) => hasValue(entry) && entry.responsePending).distinctUntilChanged();

    const isSuccessFul = responseCacheObs
      .map((entry: ResponseCacheEntry) => hasValue(entry) && entry.response.isSuccessful).distinctUntilChanged();

    const errorMessage = responseCacheObs
      .filter((entry: ResponseCacheEntry) => hasValue(entry) && !entry.response.isSuccessful)
      .map((entry: ResponseCacheEntry) => (<ErrorResponse> entry.response).errorMessage)
      .distinctUntilChanged();

    const payload =
      Observable.race(
        this.objectCache.getBySelfLink<TNormalized>(href, normalizedType),
        responseCacheObs
          .filter((entry: ResponseCacheEntry) => hasValue(entry) && entry.response.isSuccessful)
          .map((entry: ResponseCacheEntry) => (<SuccessResponse> entry.response).resourceUUIDs)
          .flatMap((resourceUUIDs: Array<string>) => {
            if (isNotEmpty(resourceUUIDs)) {
              return this.objectCache.get(resourceUUIDs[0], normalizedType);
            }
            else {
              return Observable.of(undefined);
            }
          })
          .distinctUntilChanged()
      ).map((normalized: TNormalized) => {
        return this.build<TNormalized, TDomain>(normalized);
      });

    return new RemoteData(
      href,
      requestPending,
      responsePending,
      isSuccessFul,
      errorMessage,
      payload
    );
  }

  buildList<TNormalized extends CacheableObject, TDomain>(
    href: string,
    normalizedType: GenericConstructor<TNormalized>
  ): RemoteData<TDomain[]> {
    const requestObs = this.store.select<RequestEntry>('core', 'data', 'request', href);
    const responseCacheObs = this.responseCache.get(href);

    const requestPending = requestObs.map((entry: RequestEntry) => hasValue(entry) && entry.requestPending).distinctUntilChanged();

    const responsePending = requestObs.map((entry: RequestEntry) => hasValue(entry) && entry.responsePending).distinctUntilChanged();

    const isSuccessFul = responseCacheObs
      .map((entry: ResponseCacheEntry) => hasValue(entry) && entry.response.isSuccessful).distinctUntilChanged();

    const errorMessage = responseCacheObs
      .filter((entry: ResponseCacheEntry) => hasValue(entry) && !entry.response.isSuccessful)
      .map((entry: ResponseCacheEntry) => (<ErrorResponse> entry.response).errorMessage)
      .distinctUntilChanged();

    const payload = responseCacheObs
      .filter((entry: ResponseCacheEntry) => hasValue(entry) && entry.response.isSuccessful)
      .map((entry: ResponseCacheEntry) => (<SuccessResponse> entry.response).resourceUUIDs)
      .flatMap((resourceUUIDs: Array<string>) => {
        return this.objectCache.getList(resourceUUIDs, normalizedType)
          .map((normList: TNormalized[]) => {
            return normList.map((normalized: TNormalized) => {
              return this.build<TNormalized, TDomain>(normalized);
            });
          });
      })
      .distinctUntilChanged();

    return new RemoteData(
      href,
      requestPending,
      responsePending,
      isSuccessFul,
      errorMessage,
      payload
    );
  }


  build<TNormalized extends CacheableObject, TDomain>(normalized: TNormalized): TDomain {
    let links: any = {};

    const relationships = getRelationships(normalized.constructor) || [];

    relationships.forEach((relationship: string) => {
      if (hasValue(normalized[relationship])) {
        const resourceType = getResourceType(normalized, relationship);
        const resourceConstructor = NormalizedDSOFactory.getConstructor(resourceType);
        if (Array.isArray(normalized[relationship])) {
          // without the setTimeout, the actions inside requestService.configure
          // are dispatched, but sometimes don't arrive. I'm unsure why atm.
          setTimeout(() => {
            normalized[relationship].forEach((href: string) => {
              this.requestService.configure(href, resourceConstructor)
            });
          }, 0);

          links[relationship] = normalized[relationship].map((href: string) => {
            return this.buildSingle(href, resourceConstructor);
          });
        }
        else {
          // without the setTimeout, the actions inside requestService.configure
          // are dispatched, but sometimes don't arrive. I'm unsure why atm.
          setTimeout(() => {
            this.requestService.configure(normalized[relationship], resourceConstructor);
          },0);

          links[relationship] = this.buildSingle(normalized[relationship], resourceConstructor);
        }
      }
    });

    const domainModel = getMapsTo(normalized.constructor);
    return Object.assign(new domainModel(), normalized, links);
  }

  aggregate<T>(input: RemoteData<T>[]): RemoteData<T[]> {
    const requestPending: Observable<boolean> = <Observable<boolean>> Observable.combineLatest(
      ...input.map(rd => rd.isRequestPending),
      (...pendingArray) => pendingArray.every(e => e === true)
    ).distinctUntilChanged();
    const responsePending: Observable<boolean> = <Observable<boolean>> Observable.combineLatest(
      ...input.map(rd => rd.isResponsePending),
      (...pendingArray) => pendingArray.every(e => e === true)
    ).distinctUntilChanged();
    const isSuccessFul: Observable<boolean> = <Observable<boolean>> Observable.combineLatest(
      ...input.map(rd => rd.hasSucceeded),
      (...successArray) => successArray.every(e => e === true)
    ).distinctUntilChanged();
    const errorMessage: Observable<string> = <Observable<string>> Observable.combineLatest(
      ...input.map(rd => rd.errorMessage),
      (...errors) => errors
        .map((e, idx) => {
          if (hasValue(e)) {
            return `[${idx}]: ${e}`;
          }
        })
        .filter(e => hasValue(e))
        .join(", ")
    );
    const payload = <Observable<T[]>> Observable.combineLatest(
      ...input.map(rd => rd.payload)
    );

    return new RemoteData(
      // This is an aggregated object, it doesn't necessarily correspond
      // to a single REST endpoint, so instead of a self link, use the
      // current time in ms for a somewhat unique id
      `${new Date().getTime()}`,
      requestPending,
      responsePending,
      isSuccessFul,
      errorMessage,
      payload
    );
  }
}
