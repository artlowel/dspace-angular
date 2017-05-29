import { DSpaceObject } from "./dspace-object.model";
import { Collection } from "./collection.model";
import { RemoteData } from "../data/remote-data";
import { Bundle } from "./bundle.model";
import { Bitstream } from "./bitstream.model";
import { Observable } from "rxjs";
import { hasValue } from "../../shared/empty.util";

export class Item extends DSpaceObject {

    /**
     * A string representing the unique handle of this Item
     */
    handle: string;

    /**
     * The Date of the last modification of this Item
     */
    lastModified: Date;

    /**
     * A boolean representing if this Item is currently archived or not
     */
    isArchived: boolean;

    /**
     * A boolean representing if this Item is currently withdrawn or not
     */
    isWithdrawn: boolean;

    /**
     * An array of Collections that are direct parents of this Item
     */
    parents: RemoteData<Collection[]>;

    /**
     * The Collection that owns this Item
     */
    owner: Collection;

    bundles: RemoteData<Bundle[]>;

    getThumbnail(): Observable<Bitstream> {
        const bundle: Observable<Bundle> = this.getBundle("THUMBNAIL");
        return bundle.flatMap(
            bundle => {
                if (bundle != null) {
                    return bundle.primaryBitstream.payload;
                }
                else {
                    return Observable.of(undefined);
                }
            }
        );
    }

    getFiles(): Observable<Bitstream[]> {
        const bundle: Observable <Bundle> = this.getBundle("ORIGINAL");
        return bundle
          .filter(bundle => hasValue(bundle))
          .flatMap(bundle => bundle.bitstreams.payload);
    }

    getBundle(name: String): Observable<Bundle> {
        return this.bundles.payload
            .filter(bundles => hasValue(bundles))
            .map(bundles => {
                return bundles.find((bundle: Bundle) => {
                    return bundle.name === name
                });
            });
    }

}
