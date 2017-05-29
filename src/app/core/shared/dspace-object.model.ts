import { autoserialize, autoserializeAs } from "cerialize";
import { Metadatum } from "./metadatum.model"
import { isEmpty, isNotEmpty } from "../../shared/empty.util";
import { CacheableObject } from "../cache/object-cache.reducer";
import { RemoteData } from "../data/remote-data";

/**
 * An abstract model class for a DSpaceObject.
 */
export abstract class DSpaceObject implements CacheableObject {

    @autoserialize
    self: string;

    /**
     * The human-readable identifier of this DSpaceObject
     */
    @autoserialize
    id: string;

    /**
     * The universally unique identifier of this DSpaceObject
     */
    @autoserialize
    uuid: string;

    /**
     * A string representing the kind of DSpaceObject, e.g. community, item, …
     */
    type: string;

    /**
     * The name for this DSpaceObject
     */
    @autoserialize
    name: string;

    /**
     * An array containing all metadata of this DSpaceObject
     */
    @autoserializeAs(Metadatum)
    metadata: Array<Metadatum>;

    /**
     * An array of DSpaceObjects that are direct parents of this DSpaceObject
     */
    parents: RemoteData<DSpaceObject[]>;

    /**
     * The DSpaceObject that owns this DSpaceObject
     */
    owner: DSpaceObject;

    /**
     * Find a metadata field by key and language
     *
     * This method returns the value of the first element
     * in the metadata array that matches the provided
     * key and language
     *
     * @param key
     * @param language
     * @return string
     */
    findMetadata(key: string, language?: string): string {
        const metadatum = this.metadata
            .find((metadatum: Metadatum) => {
                return metadatum.key === key &&
                    (isEmpty(language) || metadatum.language === language)
            });
        if (isNotEmpty(metadatum)) {
            return metadatum.value;
        }
        else {
            return undefined;
        }
    }

    /**
     * Find metadata by an array of keys
     *
     * This method returns the values of the element
     * in the metadata array that match the provided
     * key(s)
     *
     * @param key(s)
     * @return Array<Metadatum>
     */
    filterMetadata(keys: string[]): Array<Metadatum> {
        return this.metadata
            .filter((metadatum: Metadatum) => {
                return keys.some(key => key === metadatum.key);
            });
    }
}
